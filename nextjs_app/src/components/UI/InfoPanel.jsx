'use client';

import { useState, useEffect } from 'react';
import styles from './InfoPanel.module.css';

export default function InfoPanel({ zoom, searchCount = 0 }) {
    const [layerName, setLayerName] = useState('');

    useEffect(() => {
        let name = '';
        if (zoom >= 3 && zoom < 6) {
            name = '地方';
        } else if (zoom >= 6 && zoom < 8) {
            name = '都道府県';
        } else if (zoom >= 8 && zoom < 11) {
            name = '市区町村';
        } else if (zoom >= 11) {
            name = '詳細';
        }
        setLayerName(name);
    }, [zoom]);

    return (
        <div className={styles.infoPanel}>
            <div className={styles.zoomInfo}>
                Zoom: <span className={styles.value}>{zoom.toFixed(1)}</span>
            </div>
            <div className={styles.layerInfo}>
                Layer: <span className={styles.value}>{layerName}</span>
            </div>
            <div className={styles.clickableHint}>💡 クリックで次の階層へ</div>
            {searchCount > 0 && (
                <div className={styles.searchCount}>
                    検索結果: <span className={styles.value}>{searchCount}件</span>
                </div>
            )}
        </div>
    );
}