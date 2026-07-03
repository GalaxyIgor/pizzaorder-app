// src/components/cardapio/CartFooter.tsx
export function CartFooter() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-massa-bg via-massa-bg/90 to-transparent p-4 flex justify-center z-50">
      <button className="bg-pomodoro hover:bg-pomodoro-hover text-white w-full max-w-[900px] sm:max-w-[568px] p-4 rounded-lg font-semibold text-sm flex justify-between items-center shadow-lg transition-all active:scale-[0.99] cursor-pointer">
        <span>Ver sacola (1 item)</span>
        <span>R$ 48,90</span>
      </button>
    </div>
  );
}