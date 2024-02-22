export function App() {
  return (
    <div className="size-full flex-column p-4">
      <div className="flex gap-[12px]">
        <div className="px-2 py-1 bg-[gray]/20 rounded-[4px] cursor-pointer">
          storage.local
        </div>
        <div className="px-2 py-1 bg-[gray]/20 rounded-[4px] cursor-pointer">
          storage.sync
        </div>
        <div className="px-2 py-1 bg-[gray]/20 rounded-[4px] cursor-pointer">
          storage.session
        </div>

        <button></button>

        <input
          className="bg-[#1d1f23] focus-visible:outline-[#3e4452] focus-visible:outline-solid h-[24px] text-[#abb2bf] py-[3px] ps-[6px] placeholder:text-[#cccccc80]"
          type="text"
          placeholder="Search"
        />
      </div>
    </div>
  )
}
