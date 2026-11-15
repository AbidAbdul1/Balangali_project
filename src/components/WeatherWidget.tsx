import React from 'react';
import { WeatherData } from '../types/travel';
import { CloudRain, Sun, Wind, Droplets, RefreshCw, AlertTriangle } from 'lucide-react';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  isLoading,
  onRefresh,
}) => {
  if (isLoading) {
    return (
      <div className="py-5 border-t border-b border-[#E6E2D8] flex items-center gap-2 text-xs text-[#858B84]">
        <RefreshCw className="w-4 h-4 animate-spin text-[#243C32]" />
        <span>Checking live weather...</span>
      </div>
    );
  }

  if (!weather) return null;

  const hasRainRisk = weather.current.precipitationProbability > 40;

  return (
    <section className="py-5 border-t border-b border-[#E6E2D8] space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#91A995]">
            Live Weather · {weather.locationName.split(',')[0]}
          </p>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-display text-3xl font-semibold text-[#343A36]">
              {Math.round(weather.current.temperatureC)}°C
            </span>
            <span className="text-sm text-[#858B84]">{weather.current.weatherDescription}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh weather"
          className="p-2 rounded-full text-[#858B84] hover:text-[#243C32]"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-5 text-xs text-[#858B84]">
        <span className="inline-flex items-center gap-1">
          <Droplets className="w-3.5 h-3.5 text-[#91A995]" />
          {weather.current.relativeHumidity}% humidity
        </span>
        <span className="inline-flex items-center gap-1">
          <Wind className="w-3.5 h-3.5 text-[#91A995]" />
          {Math.round(weather.current.windSpeedKmh)} km/h wind
        </span>
        <span className={`inline-flex items-center gap-1 ${hasRainRisk ? 'text-[#D68B65] font-medium' : ''}`}>
          {hasRainRisk ? <CloudRain className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-[#D68B65]" />}
          {weather.current.precipitationProbability}% rain chance
        </span>
      </div>

      {weather.advisories.length > 0 && (
        <p className="text-xs text-[#D68B65] inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{weather.advisories[0]}</span>
        </p>
      )}

      {weather.daily.length > 0 && (
        <div className="grid grid-cols-5 gap-2 pt-2 border-t border-[#E6E2D8] text-xs">
          {weather.daily.slice(0, 5).map((day) => (
            <div key={day.date} className="space-y-0.5">
              <span className="block text-[#858B84]">
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="block font-medium text-[#343A36]">
                {Math.round(day.maxTempC)}° / {Math.round(day.minTempC)}°
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default WeatherWidget;
