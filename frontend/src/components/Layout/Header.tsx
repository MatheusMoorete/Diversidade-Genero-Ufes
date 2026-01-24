/**
 * Componente de header para mobile.
 * Design moderno e criativo com botão hambúrguer integrado.
 */


interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 supports-[backdrop-filter]:bg-white/60">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Menu e Título */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 active:scale-95 transition-all duration-200"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Gestão</span>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Pacientes</h1>
          </div>
        </div>
      </div>
    </header>
  );
};
