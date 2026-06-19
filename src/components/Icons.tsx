type IconProps = { name: 'today' | 'history' | 'insights' | 'settings' | 'plus' | 'trash' };

export function Icon({ name }: IconProps) {
  const paths = {
    today: <><path d="M4 5.5h16v14H4z"/><path d="M8 3v5m8-5v5M4 10h16"/></>,
    history: <><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></>,
    insights: <><path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5L9 6.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.5 3.1h5l.5-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4L19 13a7 7 0 0 0 .1-1Z"/></>,
    plus: <path d="M12 5v14M5 12h14"/>, trash: <><path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
