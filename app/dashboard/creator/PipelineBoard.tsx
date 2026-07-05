"use client";

import React, { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { OpportunityPageCard } from "./types";

export type PipelineStageId =
  | "new"
  | "engaged"
  | "qualified"
  | "checkout_sent"
  | "won"
  | "onboarding";

const pipelineColumns: { id: PipelineStageId; label: string; color: string; badge: string; border: string }[] = [
  { id: "new", label: "New", color: "bg-[#f0edff] text-[#4b3cff]", badge: "bg-[#e2dcff] text-[#4b3cff]", border: "border-[#e2dcff]" },
  { id: "engaged", label: "Engaged", color: "bg-[#fff3e6] text-[#ff850d]", badge: "bg-[#ffecd3] text-[#ff850d]", border: "border-[#ffecd3]" },
  { id: "qualified", label: "Qualified", color: "bg-[#eef4ff] text-[#246bff]", badge: "bg-[#dbe6ff] text-[#246bff]", border: "border-[#dbe6ff]" },
  { id: "checkout_sent", label: "Checkout Sent", color: "bg-[#eafaf0] text-[#0a9b3f]", badge: "bg-[#d6f5e2] text-[#0a9b3f]", border: "border-[#d6f5e2]" },
  { id: "won", label: "Won", color: "bg-[#fff0f3] text-[#df405b]", badge: "bg-[#ffe0e6] text-[#df405b]", border: "border-[#ffe0e6]" },
  { id: "onboarding", label: "Onboarding", color: "bg-[#f3f4f6] text-[#4b5563]", badge: "bg-[#e5e7eb] text-[#4b5563]", border: "border-[#e5e7eb]" },
];

function getDefaultStage(card: OpportunityPageCard): PipelineStageId {
  if (card.classification === "Hot") return "qualified";
  if (card.classification === "Warm") return "engaged";
  return "new";
}

function PipelineCard({
  card,
  isOverlay = false,
  isDragging = false,
}: {
  card: OpportunityPageCard;
  isOverlay?: boolean;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: card.id,
    data: {
      type: "Card",
      card,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const initials = card.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
    
  const isWon = card.classification === "Hot" && card.progress === "100%"; // Fake condition for won badge

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative flex cursor-grab flex-col rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_4px_12px_rgba(20,28,53,0.04)] transition hover:shadow-[0_8px_20px_rgba(20,28,53,0.08)] ${
        isDragging ? "opacity-30" : ""
      } ${isOverlay ? "cursor-grabbing shadow-[0_22px_60px_rgba(20,28,53,0.12)] rotate-2" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white shadow-sm ${
            card.tone === "green"
              ? "bg-[#20b85c]"
              : card.tone === "blue"
              ? "bg-[#246bff]"
              : card.tone === "orange"
              ? "bg-[#ff850d]"
              : card.tone === "red"
              ? "bg-[#df405b]"
              : "bg-[#4b3cff]"
          }`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="truncate text-[13px] font-extrabold text-black">{card.name}</h4>
            {isWon && (
              <span className="flex items-center gap-1 rounded-[4px] bg-[#eafaf0] px-1.5 py-0.5 text-[9px] font-extrabold text-[#13a84f]">
                ✓ Won
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[11px] font-medium text-[#596175]">{card.subtitle}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#8b92a6]">{card.time}</span>
        {card.value && (
          <span className="text-[11px] font-extrabold text-[#30384d]">{card.value}</span>
        )}
      </div>
    </div>
  );
}

function PipelineColumn({
  column,
  cards,
}: {
  column: typeof pipelineColumns[0];
  cards: OpportunityPageCard[];
}) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  });

  const totalValue = cards.reduce((sum, card) => {
    if (!card.value) return sum;
    const num = Number(card.value.replace(/[^0-9.-]+/g,""));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${column.color.split(" ")[0]}`} />
          <h3 className="text-[14px] font-extrabold text-black">{column.label}</h3>
          <span className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold ${column.badge}`}>
            {cards.length}
          </span>
        </div>
      </div>
      <div className="mb-3 px-1 text-[12px] font-bold text-[#8b92a6]">
        {totalValue > 0 ? `$${totalValue.toLocaleString()}` : "$0"}
      </div>
      <div
        ref={setNodeRef}
        className="flex min-h-[200px] flex-col gap-3 rounded-[16px] bg-[#f8f9fc] p-2 transition-colors"
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <PipelineCard key={card.id} card={card} />
          ))}
        </SortableContext>
        <button className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#d7deeb] bg-transparent text-[12px] font-bold text-[#8b92a6] transition hover:border-[#c4ccdd] hover:bg-white hover:text-[#596175]">
          + Add card
        </button>
      </div>
    </div>
  );
}

export function PipelineBoard({ cards }: { cards: OpportunityPageCard[] }) {
  const [stageOverrides, setStageOverrides] = useState<Record<string, PipelineStageId>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const mappedCards = useMemo(() => {
    return cards.map((card) => ({
      ...card,
      pipelineStage: stageOverrides[card.id] || getDefaultStage(card),
    }));
  }, [cards, stageOverrides]);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveId(active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveCard = active.data.current?.type === "Card";
    const isOverCard = over.data.current?.type === "Card";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveCard) return;

    // Moving over a card
    if (isOverCard) {
      const activeCard = mappedCards.find((c) => c.id === activeId);
      const overCard = mappedCards.find((c) => c.id === overId);
      if (activeCard && overCard && activeCard.pipelineStage !== overCard.pipelineStage) {
        setStageOverrides((prev) => ({
          ...prev,
          [activeId]: overCard.pipelineStage as PipelineStageId,
        }));
      }
    }
    // Moving over a column directly
    else if (isOverColumn) {
      const activeCard = mappedCards.find((c) => c.id === activeId);
      if (activeCard && activeCard.pipelineStage !== overId) {
        setStageOverrides((prev) => ({
          ...prev,
          [activeId]: overId as PipelineStageId,
        }));
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
  }

  const activeCard = useMemo(() => {
    return mappedCards.find((c) => c.id === activeId);
  }, [activeId, mappedCards]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-6 flex flex-col gap-2 lg:px-8">
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-extrabold leading-none text-black sm:text-[28px]">Customer Pipeline</h1>
          <span className="flex items-center gap-1.5 rounded-full bg-[#eafaf0] px-2.5 py-1 text-[10px] font-extrabold text-[#0a9b3f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#20b85c]" />
            Live
          </span>
        </div>
        <p className="text-[12px] font-medium leading-[1.4] text-[#596175]">
          Visualize every customer and where they are in their journey.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 overflow-x-auto pb-12 lg:px-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-5">
            {pipelineColumns.map((col) => (
              <PipelineColumn
                key={col.id}
                column={col}
                cards={mappedCards.filter((c) => c.pipelineStage === col.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard ? <PipelineCard card={activeCard} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
