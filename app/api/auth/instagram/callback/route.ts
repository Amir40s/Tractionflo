import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  exchangeInstagramTokenForLongLivedToken,
  saveInstagramAccountToken,
} from '@/lib/instagram-token';
import {
  fetchInstagramBusinessProfile,
  fetchInstagramBusinessPosts,
  analyzeInstagramBusinessContextWithVision,
  generateBusinessContextPrompt,
  saveBusinessContextToDatabase,
} from '@/lib/instagram-business-context';
import {
  getOrCreateAssistant,
  getOrCreateVectorStore,
  attachVectorStoreToAssistant,
  uploadFileToVectorStore,
} from '@/lib/openai-assistants';
import { getInstagramAppCredentials, getNormalizedAppBaseUrl } from '@/lib/instagram-oauth';
import { getGlobalChannel, getSuperAdminChannel, triggerRealtimeNotification } from '@/lib/pusher';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';
import logger from '@/lib/logger';
import {
  buildKnowledgeSourceIndex,
  createKnowledgeStoragePaths,
  listKnowledgeSourceIndexes,
  saveKnowledgeSourceIndex,
} from '@/lib/knowledge-base';

function getAppBaseUrl(request: NextRequest) {
  return getNormalizedAppBaseUrl(request.nextUrl.origin);
}

type InstagramOAuthState = {
  next: string;
  returnTo?: string;
  userId?: string;
  expectedUsername?: string;
  signature?: string;
};

type InstagramCodeTokenResponse = {
  access_token?: string;
  user_id?: string | number;
  error?: {
    message?: string;
  };
  error_message?: string;
};

function isSafeNextPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

function isAllowedReturnOrigin(origin: string, callbackOrigin: string, appBaseUrl: string) {
  const allowedOrigins = new Set([callbackOrigin, new URL(appBaseUrl).origin]);

  // Always allow localhost so local dev OAuth flows redirect back correctly
  // even when the callback runs on the production Vercel deployment
  allowedOrigins.add('http://localhost:3000');
  allowedOrigins.add('http://localhost:3001');
  allowedOrigins.add('http://localhost:3002');
  allowedOrigins.add('http://127.0.0.1:3000');
  allowedOrigins.add('http://127.0.0.1:3001');
  allowedOrigins.add('http://127.0.0.1:3002');

  return allowedOrigins.has(origin);
}

function getStateSignature({
  nextPath,
  returnTo,
  userId,
  expectedUsername = '',
  secret,
}: {
  nextPath: string;
  returnTo: string;
  userId: string;
  expectedUsername?: string;
  secret: string;
}) {
  return createHmac('sha256', secret)
    .update(`${userId}:${nextPath}:${returnTo}:${expectedUsername}`)
    .digest('hex');
}

function isValidStateSignature({
  nextPath,
  returnTo,
  userId,
  expectedUsername,
  signature,
  secret,
}: {
  nextPath: string;
  returnTo: string;
  userId: string;
  expectedUsername?: string;
  signature: string;
  secret: string;
}) {
  const expected = getStateSignature({ nextPath, returnTo, userId, expectedUsername, secret });

  try {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

function getOAuthState(
  value: string | null,
  callbackOrigin: string,
  appBaseUrl: string,
  stateSecret?: string
): InstagramOAuthState {
  if (!value) {
    console.error('getOAuthState: no value provided');
    return { next: '/dashboard' };
  }

  if (isSafeNextPath(value)) {
    console.error('getOAuthState: value is just a next path', value);
    return { next: value };
  }

  try {
    const parsed = JSON.parse(value) as Partial<InstagramOAuthState>;
    const next = isSafeNextPath(parsed.next) ? parsed.next : '/dashboard';
    const returnTo =
      typeof parsed.returnTo === 'string' && isAllowedReturnOrigin(parsed.returnTo, callbackOrigin, appBaseUrl)
        ? parsed.returnTo
        : undefined;
    const userId = typeof parsed.userId === 'string' ? parsed.userId : '';
    const expectedUsername = typeof parsed.expectedUsername === 'string' ? parsed.expectedUsername : '';
    const signature = typeof parsed.signature === 'string' ? parsed.signature : '';

    console.log('getOAuthState parsed values:', { next, returnTo, userId, expectedUsername, signature, stateSecret: !!stateSecret, originalReturnTo: parsed.returnTo, callbackOrigin, appBaseUrl });

    const isValid = userId && signature && stateSecret && isValidStateSignature({
      nextPath: next,
      returnTo: returnTo || '',
      userId,
      expectedUsername,
      signature,
      secret: stateSecret,
    });

    console.log('getOAuthState signature validation:', { isValid });

    const verifiedData = isValid
      ? { userId, expectedUsername }
      : { userId: undefined, expectedUsername: undefined };

    return { next, returnTo, userId: verifiedData.userId, expectedUsername: verifiedData.expectedUsername };
  } catch (error) {
    console.error('getOAuthState JSON parse error:', error);
    return { next: '/dashboard' };
  }
}

function getSafeNextPath(value: string | null) {
  if (value?.startsWith('/') && !value.startsWith('//')) {
    return value;
  }

  return '/dashboard';
}

function getSoftwareRedirect(baseUrl: string, nextPath: string, params: Record<string, string>) {
  const redirectUrl = new URL(nextPath, baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    redirectUrl.searchParams.set(key, value);
  });

  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = getAppBaseUrl(request);
  const callbackOrigin = request.nextUrl.origin;
  const { appId, appSecret } = getInstagramAppCredentials();
  const oauthState = getOAuthState(searchParams.get('state'), callbackOrigin, baseUrl, appSecret);
  const redirectBaseUrl = oauthState.returnTo || baseUrl;
  const nextPath = getSafeNextPath(oauthState.next);

  if (error) {
    return NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, nextPath, {
        ig_error: searchParams.get('error_description') || 'Authorization failed',
      })
    );
  }

  if (!code) {
    return NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, nextPath, {
        ig_error: 'No Instagram authorization code provided',
      })
    );
  }

  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, nextPath, {
        ig_error: 'Server configuration missing',
      })
    );
  }

  try {
    const formData = new URLSearchParams();
    formData.append('client_id', appId);
    formData.append('client_secret', appSecret);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', redirectUri);
    formData.append('code', code);

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokenData = (await tokenResponse.json()) as InstagramCodeTokenResponse;

    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token || !tokenData.user_id) {
      throw new Error(
        tokenData.error?.message || tokenData.error_message || 'Instagram did not return an access token'
      );
    }

    const oauthUserId = tokenData.user_id.toString();
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError && !oauthState.userId) {
      throw authError;
    }

    const ownerUserId = oauthState.userId || user?.id;

    if (!ownerUserId) {
      throw new Error('Log in before connecting Instagram.');
    }

    const supabase = createSupabaseServiceClient();

    // Fetch the real Instagram Business Account ID (Page ID) to match webhook events
    let igPageId = oauthUserId;
    try {
      const meUrl = new URL('https://graph.instagram.com/v21.0/me');
      meUrl.searchParams.set('fields', 'user_id,id');
      meUrl.searchParams.set('access_token', tokenData.access_token);
      const meRes = await fetch(meUrl.toString());
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user_id) {
          igPageId = meData.user_id.toString();
        } else if (meData.id) {
          igPageId = meData.id.toString();
        }
      }
    } catch (meError) {
      console.error('Failed to fetch real Instagram Page ID in OAuth callback:', meError);
    }

    // Fast-path: check if this Instagram account is already connected to another TractionFlo user
    const { data: existingConnection, error: connectionCheckError } = await supabase
      .from('instagram_accounts')
      .select('user_id')
      .eq('ig_user_id', igPageId)
      .not('user_id', 'is', null)
      .maybeSingle();

    if (connectionCheckError) {
      console.error('Error checking existing Instagram connection:', connectionCheckError);
    }

    if (existingConnection && (existingConnection as any).user_id !== ownerUserId) {
      throw new Error('This Instagram account is already connected to another TractionFlo user.');
    }

    const longLivedToken = await exchangeInstagramTokenForLongLivedToken({
      accessToken: tokenData.access_token,
      appSecret,
    });

    const accessToken = longLivedToken.accessToken;

    await saveInstagramAccountToken(supabase, {
      user_id: ownerUserId,
      ig_user_id: igPageId,
      access_token: accessToken,
    });

    // Fetch and train AI with business context (top 6 posts)
    try {
      logger.info('Starting business context fetch after Instagram connection', { userId: ownerUserId });

      const profile = await fetchInstagramBusinessProfile(accessToken);
      const posts = await fetchInstagramBusinessPosts(accessToken, 6);

      if (posts.length > 0) {
        const analysis = await analyzeInstagramBusinessContextWithVision({
          apiKey: process.env.OPENAI_API_KEY,
          profile,
          posts,
          maxPosts: 5,
        });

        // Save to database
        await saveBusinessContextToDatabase(
          supabase,
          ownerUserId,
          profile,
          posts,
          analysis.keywords,
          analysis.contentPillars,
          analysis.summary
        );

        // Auto-create a Knowledge Base entry from the Instagram business context analysis
        let uploadedOpenAiFileId: string | undefined = undefined;
        let finalVectorStoreId: string | undefined = undefined;

        const openaiApiKey = process.env.OPENAI_API_KEY;
        let userMetadata: Record<string, any> = {};

        try {
          const { data: userData } = await supabase.auth.admin.getUserById(ownerUserId);
          if (userData?.user) {
            userMetadata = userData.user.user_metadata || {};
          }
        } catch (e) {
          logger.warn('Failed to retrieve user metadata for vector store resolution', { userId: ownerUserId });
        }

        if (openaiApiKey) {
          try {
            let vectorStoreId = userMetadata.openai_vector_store_id as string | undefined;
            const vectorStore = await getOrCreateVectorStore({ apiKey: openaiApiKey, vectorStoreId });
            finalVectorStoreId = vectorStore.id;
          } catch (vsError) {
            logger.warn('Failed resolving OpenAI vector store during Instagram connection', { error: vsError });
          }
        }

        try {
          const existingSources = await listKnowledgeSourceIndexes(supabase, ownerUserId).catch(() => []);
          const autoEntry = existingSources.find((s) => s.title === 'Instagram Info (Auto-generated)');
          const sourceId = autoEntry?.id ?? globalThis.crypto.randomUUID();
          const fileName = 'Instagram-Info.manual.txt';
          const { indexPath } = createKnowledgeStoragePaths(ownerUserId, sourceId, fileName);
          const kbText = `Instagram Profile: ${profile.name} (@${profile.username})\nNiche / Selling: ${analysis.sellingWhat}\n\nSummary:\n${analysis.summary}\n\nKeywords:\n${analysis.keywords.join(', ')}\n\nContent Pillars:\n${analysis.contentPillars.join('\n')}`;
          const indexedText = `Category: Business Information\nTitle: Instagram Info (Auto-generated)\n\n${kbText}`;
          const assignment = existingSources.filter((s) => s.id !== autoEntry?.id).length === 0 ? 'default' : 'auto';

          if (openaiApiKey && finalVectorStoreId) {
            try {
              const fileBuffer = Buffer.from(indexedText, "utf8");
              const uploadedOpenAiFile = await uploadFileToVectorStore({
                apiKey: openaiApiKey,
                vectorStoreId: finalVectorStoreId,
                fileBuffer,
                fileName,
                mimeType: "text/plain",
              });
              uploadedOpenAiFileId = uploadedOpenAiFile.id;
            } catch (uploadError) {
              logger.warn('Failed uploading Instagram context file to OpenAI vector store', { error: uploadError });
            }
          }

          const sourceIndex = buildKnowledgeSourceIndex({
            userId: ownerUserId,
            sourceId,
            fileName,
            mimeType: 'text/x-tractionflo-manual',
            fileSize: Buffer.byteLength(indexedText, 'utf8'),
            filePath: '',
            indexPath,
            text: indexedText,
            assignment,
            categories: [profile.name || 'Instagram Business', 'Business Information'],
            openAiFileId: uploadedOpenAiFileId || autoEntry?.openAiFileId,
          });
          (sourceIndex as any).title = 'Instagram Info (Auto-generated)';
          await saveKnowledgeSourceIndex(supabase, sourceIndex);
          logger.info('Auto-created Instagram Knowledge Base source', { userId: ownerUserId });
        } catch (kbError) {
          logger.error('Failed to auto-create Instagram Knowledge Base source', {
            userId: ownerUserId,
            error: kbError instanceof Error ? kbError.message : String(kbError),
          });
        }

        if (openaiApiKey) {
          try {
            const businessContextPrompt = generateBusinessContextPrompt(
              profile,
              posts,
              analysis.keywords,
              analysis.contentPillars,
              analysis.summary
            );

            const baseInstructions = `You are an AI customer service assistant for ${profile.name}'s Instagram business. 

Be helpful, professional, and knowledgeable about the business. Use the business context provided to give accurate and relevant responses.

The account appears to sell or promote: ${analysis.sellingWhat}

The AI learned this from the profile bio, post captions, and post images.

${businessContextPrompt}`;

            const assistant = await getOrCreateAssistant({
              apiKey: openaiApiKey,
              name: `${profile.name} AI Assistant`,
              instructions: baseInstructions,
              model: 'gpt-4o-mini',
            });

            logger.info('AI assistant trained with business context', {
              userId: ownerUserId,
              assistantId: assistant.id,
              postsCount: posts.length,
            });

            // Attach vector store to assistant if needed
            if (finalVectorStoreId) {
              try {
                await attachVectorStoreToAssistant({
                  apiKey: openaiApiKey,
                  assistantId: assistant.id,
                  vectorStoreId: finalVectorStoreId,
                });
              } catch (attachError) {
                logger.warn('Failed attaching vector store to assistant during Instagram connection', { error: attachError });
              }
            }

            // Save the assistant ID and vector store ID to the user's metadata in the database
            try {
              await supabase.auth.admin.updateUserById(ownerUserId, {
                user_metadata: {
                  ...userMetadata,
                  openai_assistant_id: assistant.id,
                  openai_vector_store_id: finalVectorStoreId || userMetadata.openai_vector_store_id,
                },
              });
              logger.info('Saved AI assistant ID and vector store ID to user metadata in DB', { userId: ownerUserId, assistantId: assistant.id, vectorStoreId: finalVectorStoreId });
            } catch (saveMetaError) {
              logger.error('Failed to save assistant and vector store IDs to user metadata in DB', {
                userId: ownerUserId,
                error: saveMetaError instanceof Error ? saveMetaError.message : String(saveMetaError),
              });
            }
          } catch (aiError) {
            logger.warn('Failed to train AI assistant with business context', {
              userId: ownerUserId,
              error: aiError instanceof Error ? aiError.message : String(aiError),
            });
          }
        }
      } else {
        logger.info('No posts found for business context', { userId: ownerUserId });
      }
    } catch (businessContextError) {
      logger.error('Error fetching business context after Instagram connection', {
        userId: ownerUserId,
        error: businessContextError instanceof Error ? businessContextError.message : String(businessContextError),
      });
      // Don't fail the OAuth flow if business context fails
    }

    await triggerRealtimeNotification([getGlobalChannel(), getSuperAdminChannel()], {
      type: 'instagram',
      title: 'Instagram connected',
      body: 'A creator connected an Instagram account successfully.',
      url: '/settings',
      metadata: {
        userId: ownerUserId,
        igUserId: igPageId,
      },
    }).catch((notificationError) => {
      console.error('Realtime Instagram connect notification error:', notificationError);
    });

    const response = NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, nextPath, {
        ig_connected: 'true',
        ig_scan: 'true',
        from: nextPath.replace(/^\//, '') || 'instagram',
      })
    );

    // Keeping cookie as fallback for frontend state
    response.cookies.set('ig_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: longLivedToken.expiresIn || 60 * 60 * 24 * 60
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Instagram OAuth error';
    console.error('Instagram OAuth Error:', err);
    return NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, nextPath, {
        ig_error: message,
      })
    );
  }
}
