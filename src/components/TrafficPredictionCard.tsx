import React, { useState } from 'react';
import { TrafficPredictionResult } from '../types/travel';
import { Activity, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface TrafficPredictionCardProps {
  prediction: TrafficPredictionResult | null;
  isLoading: boolean;
  onDepartureTimeChange?: (time: string) => void;
}

export const TrafficPredictionCard: React.FC<TrafficPredictionCardProps> = ({
  prediction,
  isLoading,
  onDepartureTimeChange,
}) => {
  const [showMetrics, setShowMetrics] = useState(false);

  if (isLoading) {
    return (
      <div className="py-6 border-t border-[#E6E2D8] flex items-center gap-2 text-xs text-[#858B84]">
        <Activity className="w-4 h-4 animate-spin text-[#243C32]" />
        <span>Estimating corridor travel conditions...</span>
      </div>
    );
  }

  if (!prediction) return null;

  const isHeavy = prediction.congestionLevel === 'Heavy' || prediction.congestionLevel === 'Severe';

  return (
    <section className="py-6 border-t border-[#E6E2D8] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#91A995]">
            Corridor Traffic Forecast
          </p>
          <h3 className="font-display text-lg font-semibold text-[#343A36] mt-0.5">
            {prediction.roadName}
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {onDepartureTimeChange && (
            <label className="inline-flex items-center gap-1.5 text-[#858B84]">
              <Clock className="w-3.5 h-3.5" />
              <input
                type="time"
                value={prediction.departureTime}
                onChange={(e) => onDepartureTimeChange(e.target.value)}
                className="bg-transparent text-[#343A36] font-medium border-b border-[#D8D2C5] focus:outline-none focus:border-[#243C32]"
              />
            </label>
          )}
          <span className={`font-semibold ${isHeavy ? 'text-[#D68B65]' : 'text-[#243C32]'}`}>
            {prediction.congestionLevel} traffic
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm py-2">
        <div>
          <span className="block text-xs text-[#858B84]">Expected speed</span>
          <span className="font-semibold text-[#343A36]">{Math.round(prediction.predictedSpeedKmh)} km/h</span>
        </div>
        <div>
          <span className="block text-xs text-[#858B84]">Free-flow</span>
          <span className="font-semibold text-[#343A36]">{Math.round(prediction.freeFlowSpeedKmh)} km/h</span>
        </div>
        <div>
          <span className="block text-xs text-[#858B84]">Model confidence</span>
          <span className="font-semibold text-[#343A36]">{Math.round(prediction.confidenceScore)}%</span>
        </div>
      </div>

      {prediction.hourlyTrends.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pt-1">
          {prediction.hourlyTrends.slice(0, 8).map((slot) => (
            <div key={slot.hour} className="min-w-[70px] py-1.5 border-b border-[#E6E2D8] text-xs">
              <span className="block text-[#858B84]">{slot.hour}</span>
              <span className="font-medium text-[#343A36]">{slot.speedKmh} km/h</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowMetrics((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs text-[#858B84] hover:text-[#343A36]"
        >
          <span>{showMetrics ? 'Hide model notes' : 'View forecast details'}</span>
          {showMetrics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showMetrics && (
          <p className="mt-2 text-xs text-[#858B84] leading-relaxed">
            {prediction.modelVersion} · MAE {prediction.evaluationMetrics.maeMinutes.toFixed(1)} min vs baseline{' '}
            {prediction.evaluationMetrics.baselineMaeMinutes.toFixed(1)} min. {prediction.disclaimer}
          </p>
        )}
      </div>
    </section>
  );
};

export default TrafficPredictionCard;
