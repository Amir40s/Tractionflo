export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-8 w-8">
        <div className="absolute left-0 top-0 h-2 w-7 rounded-full bg-gradient-to-r from-[#8156ff] to-[#3529ff]" />
        <div className="absolute left-[9px] top-[2px] h-6 w-2 rounded-full bg-gradient-to-b from-[#5d43ff] to-[#8b6dff]" />
        <div className="absolute right-0.5 top-[6px] h-2.5 w-2.5 rounded-full bg-[#8a70ff]" />
      </div>
      <span className="text-[20px] font-extrabold leading-none text-black">TractionFlo</span>
    </div>
  );
}
