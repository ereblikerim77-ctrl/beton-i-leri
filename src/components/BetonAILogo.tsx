interface BetonAILogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function BetonAILogo({ size = 'md' }: BetonAILogoProps) {
  const wrapperClass =
    size === 'sm'
      ? 'h-5 w-5'
      : size === 'lg'
      ? 'h-11 w-11'
      : 'h-9 w-9';

  const scaleClass =
    size === 'sm'
      ? 'beton-ai-loader--sm'
      : size === 'lg'
      ? 'beton-ai-loader--lg'
      : 'beton-ai-loader--md';

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${wrapperClass}`}
      aria-hidden="true"
    >
      <div className={`beton-ai-loader shrink-0 ${scaleClass}`}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <defs>
            <mask id="beton-ai-clipping">
              <polygon points="0,0 100,0 100,100 0,100" fill="black" />
              <polygon points="25,25 75,25 50,75" fill="white" />
              <polygon points="50,25 75,75 25,75" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
            </mask>
          </defs>
        </svg>
        <div className="box" />
      </div>
    </span>
  );
}
