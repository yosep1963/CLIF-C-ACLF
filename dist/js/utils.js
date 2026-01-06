/**
 * CLIF-C ACLF Score Calculator
 * 공통 유틸리티 함수
 */

const Utils = {
    /**
     * 숫자 파싱 (안전한 변환)
     * @param {any} value - 변환할 값
     * @param {number} defaultValue - 기본값
     * @returns {number}
     */
    parseNumber(value, defaultValue = 0) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    },

    /**
     * MAP (Mean Arterial Pressure) 계산
     * MAP = (SBP + 2 × DBP) / 3
     * @param {number} sbp - 수축기 혈압
     * @param {number} dbp - 이완기 혈압
     * @returns {number}
     */
    calculateMAP(sbp, dbp) {
        if (sbp <= 0 || dbp <= 0) return 0;
        return Math.round((sbp + 2 * dbp) / 3);
    },

    /**
     * FiO2 계산 (O2 유량 기반)
     * Room air = 21%, 각 1 L/min당 +4%
     * @param {number} o2flow - O2 유량 (L/min)
     * @returns {number}
     */
    calculateFiO2(o2flow) {
        const flow = this.parseNumber(o2flow, 0);
        if (flow <= 0) return Config.FIO2.ROOM_AIR;
        return Math.min(
            Config.FIO2.ROOM_AIR + (flow * Config.FIO2.PER_LITER),
            Config.FIO2.MAX
        );
    },

    /**
     * SpO2 → PaO2 변환 (경험적 공식)
     * PaO2 ≈ 22 × exp(SpO2 × 0.0308)
     * @param {number} spo2 - SpO2 (%)
     * @returns {number}
     */
    convertSpO2ToPaO2(spo2) {
        const { min, max } = Config.INPUT_RANGES.spo2;
        if (spo2 < min || spo2 > max) return 0;
        return Config.SPO2_CONVERSION.COEFFICIENT *
               Math.exp(spo2 * Config.SPO2_CONVERSION.EXPONENT);
    },

    /**
     * P/F ratio 계산
     * @param {number} pao2Value - PaO2 값 (mmHg)
     * @param {number} fio2 - FiO2 (%)
     * @returns {number}
     */
    calculatePFRatio(pao2Value, fio2) {
        if (pao2Value > 0 && fio2 >= Config.FIO2.ROOM_AIR) {
            return pao2Value / (fio2 / 100);
        }
        return 0;
    },

    /**
     * O2 유량 텍스트 생성
     * @param {number} o2flow - O2 유량 (L/min)
     * @returns {string}
     */
    getO2FlowText(o2flow) {
        const flow = this.parseNumber(o2flow, 0);
        const fio2 = this.calculateFiO2(flow);
        if (flow === 0) {
            return `Room air (${fio2}%)`;
        }
        return `${flow} L/min (${fio2}%)`;
    },

    /**
     * 점수 색상 클래스 반환
     * @param {number} score - 점수 (1, 2, 3)
     * @returns {string}
     */
    getScoreClass(score) {
        return `score-${score}`;
    },

    /**
     * P/F ratio에서 점수 결정
     * @param {number} ratio - P/F ratio
     * @returns {number}
     */
    getPFRatioScore(ratio) {
        if (ratio > 300) return 1;
        if (ratio >= 200) return 2;
        return 3;
    },

    /**
     * MAP에서 점수 결정 (승압제 사용 시 3점)
     * @param {number} map - MAP (mmHg)
     * @param {boolean} isVasopressors - 승압제 사용 여부
     * @returns {number}
     */
    getMAPScore(map, isVasopressors) {
        if (isVasopressors) return 3;
        return map >= 70 ? 1 : 2;
    },

    /**
     * 날짜 포맷팅
     * @param {Date|number} date - 날짜 객체 또는 타임스탬프
     * @param {boolean} includeTime - 시간 포함 여부
     * @returns {string}
     */
    formatDate(date, includeTime = true) {
        const d = new Date(date);
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return d.toLocaleString('ko-KR', options);
    },

    /**
     * 숫자 천단위 콤마 포맷
     * @param {number} num - 숫자
     * @returns {string}
     */
    formatNumber(num) {
        return num.toLocaleString();
    },

    /**
     * DOM 요소 가져오기 (캐싱 지원)
     * @param {string} id - 요소 ID
     * @returns {HTMLElement|null}
     */
    getElement(id) {
        return document.getElementById(id);
    },

    /**
     * DOM 요소들 가져오기 (셀렉터 기반)
     * @param {string} selector - CSS 셀렉터
     * @returns {NodeList}
     */
    getElements(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * 토스트 메시지 표시
     * @param {string} message - 메시지
     * @param {number} duration - 표시 시간 (ms)
     */
    showToast(message, duration = 2500) {
        const toast = this.getElement('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },

    /**
     * 범위 내 값인지 확인
     * @param {number} value - 확인할 값
     * @param {number} min - 최소값
     * @param {number} max - 최대값
     * @returns {boolean}
     */
    isInRange(value, min, max) {
        return value >= min && value <= max;
    },

    /**
     * 디바운스 함수
     * @param {Function} func - 실행할 함수
     * @param {number} wait - 대기 시간 (ms)
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// 모듈 내보내기
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}
