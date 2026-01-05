/**
 * CLIF-C ACLF Score Calculator
 * localStorage 이력 관리 모듈 (리팩터링 버전)
 */

const Storage = {
    /**
     * 저장소 키 (Config에서 가져옴)
     */
    get STORAGE_KEY() {
        return Config.STORAGE.KEY;
    },

    /**
     * 최대 이력 개수 (Config에서 가져옴)
     */
    get MAX_HISTORY() {
        return Config.STORAGE.MAX_HISTORY;
    },

    /**
     * 이력에 결과 저장
     * @param {Object} result - 계산 결과
     * @returns {boolean} 성공 여부
     */
    saveToHistory(result) {
        try {
            const history = this.getHistory();

            // 새 항목 추가 (맨 앞에)
            history.unshift({
                inputs: result.inputs,
                organScores: result.organScores,
                ofScore: result.ofScore,
                aclfScore: result.aclfScore,
                aclfGrade: result.aclfGrade,
                prognosis: result.prognosis,
                timestamp: result.timestamp || new Date().toISOString()
            });

            // 최대 개수 유지
            if (history.length > this.MAX_HISTORY) {
                history.pop();
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
            return true;
        } catch (error) {
            console.error('이력 저장 실패:', error);
            return false;
        }
    },

    /**
     * 이력 조회
     * @returns {Array} 이력 배열
     */
    getHistory() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('이력 조회 실패:', error);
            return [];
        }
    },

    /**
     * 특정 이력 항목 조회
     * @param {number} index - 인덱스
     * @returns {Object|null} 이력 항목
     */
    getHistoryItem(index) {
        const history = this.getHistory();
        return history[index] || null;
    },

    /**
     * 특정 이력 항목 삭제
     * @param {number} index - 인덱스
     * @returns {boolean} 성공 여부
     */
    removeHistoryItem(index) {
        try {
            const history = this.getHistory();

            if (index >= 0 && index < history.length) {
                history.splice(index, 1);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
                return true;
            }

            return false;
        } catch (error) {
            console.error('이력 삭제 실패:', error);
            return false;
        }
    },

    /**
     * 전체 이력 삭제
     * @returns {boolean} 성공 여부
     */
    clearHistory() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('이력 전체 삭제 실패:', error);
            return false;
        }
    },

    /**
     * 이력 개수 조회
     * @returns {number} 이력 개수
     */
    getHistoryCount() {
        return this.getHistory().length;
    },

    /**
     * localStorage 사용 가능 여부 확인
     * @returns {boolean} 사용 가능 여부
     */
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
};

// 모듈 내보내기
if (typeof window !== 'undefined') {
    window.Storage = Storage;
}
