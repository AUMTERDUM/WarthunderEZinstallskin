import React from 'react';
import { t, formatBytes } from '../lib/i18n';

/**
 * Statistics panel showing skins/sound mod counts and sizes
 */
function StatisticsPanel({ lang, statistics }) {
  if (!statistics) return null;

  return (
    <div className="statistics-panel">
      <div className="statistics-header">
        <span>📊 {t(lang, 'statistics.title')}</span>
      </div>
      <div className="statistics-content">
        <div className="stat-item">
          <span className="stat-icon">📦</span>
          <div className="stat-info">
            <div className="stat-label">{t(lang, 'statistics.skins')}</div>
            <div className="stat-value">{statistics.skins.count} {t(lang, 'statistics.items')}</div>
            <div className="stat-size">{formatBytes(statistics.skins.size)}</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🔊</span>
          <div className="stat-info">
            <div className="stat-label">{t(lang, 'statistics.soundMods')}</div>
            <div className="stat-value">{statistics.soundMods.count} {t(lang, 'statistics.items')}</div>
            <div className="stat-size">{formatBytes(statistics.soundMods.size)}</div>
          </div>
        </div>
        <div className="stat-item total">
          <span className="stat-icon">💾</span>
          <div className="stat-info">
            <div className="stat-label">{t(lang, 'statistics.totalSize')}</div>
            <div className="stat-value">{formatBytes(statistics.totalSize)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(StatisticsPanel);
