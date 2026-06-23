"use client";

import { type ChangeEventHandler, useState } from "react";

type PasswordFieldProps = {
  id?: string;
  name?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

export default function PasswordField({
  id = "password",
  name = "password",
  required = false,
  placeholder = "Password",
  autoComplete = "current-password",
  className = "w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84a300] focus:border-transparent transition-all font-medium text-sm text-black placeholder:text-gray-400",
  value,
  onChange,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={className}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setShowPassword((visible) => !visible)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
      >
        {showPassword ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.584 10.587a2 2 0 002.828 2.826"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.88 4.24A9.77 9.77 0 0112 4c4.478 0 8.268 2.943 9.542 7a10.03 10.03 0 01-4.132 5.411"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6.102 6.105A10.03 10.03 0 002.458 11C3.732 15.057 7.523 18 12 18a9.78 9.78 0 004.02-.86"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        )}
      </button>
    </>
  );
}
