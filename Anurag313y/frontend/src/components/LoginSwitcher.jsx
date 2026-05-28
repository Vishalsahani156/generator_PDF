function LoginSwitcher({ mode, onModeChange, variant = 'light' }) {
  const activeClass =
    variant === 'dark'
      ? 'bg-white/15 text-white'
      : 'bg-indigo-600 text-white';
  const inactiveClass =
    variant === 'dark'
      ? 'bg-transparent text-white/75 hover:bg-white/10 hover:text-white'
      : 'bg-white text-slate-700 hover:bg-slate-50';

  return (
    <div
      className={`rounded-xl p-1 ${
        variant === 'dark'
          ? 'border border-white/10 bg-white/5'
          : 'border border-slate-200 bg-slate-100'
      }`}
    >
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onModeChange('user')}
          className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
            mode === 'user' ? activeClass : inactiveClass
          }`}
        >
          User login
        </button>
        <button
          type="button"
          onClick={() => onModeChange('admin')}
          className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
            mode === 'admin' ? activeClass : inactiveClass
          }`}
        >
          Admin login
        </button>
      </div>
    </div>
  );
}

export default LoginSwitcher;

