/**
 * CLIF-C ACLF Score Calculator
 * 클립보드 복사 모듈 (리팩터링 버전)
 */

const Clipboard = {
    /**
     * 계산 결과를 클립보드에 복사
     * @param {Object} result - 계산 결과
     * @returns {Promise<boolean>} 성공 여부
     */
    async copyResult(result) {
        const text = this.formatResultText(result);

        try {
            // 최신 Clipboard API 시도
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }

            // Fallback: execCommand 사용
            return this.fallbackCopy(text);
        } catch (error) {
            console.error('클립보드 복사 실패:', error);
            // Fallback 시도
            return this.fallbackCopy(text);
        }
    },

    /**
     * 결과를 텍스트 형식으로 포맷팅
     * @param {Object} result - 계산 결과
     * @returns {string} 포맷된 텍스트
     */
    formatResultText(result) {
        const dateStr = Utils.formatDate(result.timestamp, true);

        const organScoreText = this._formatOrganScores(result.organScores);
        const bpText = this._formatBloodPressure(result.inputs);
        const oxygenText = this._formatOxygenation(result.inputs);
        const o2Text = this._formatO2Flow(result.inputs);
        const pfText = this._formatPFRatio(result.inputs);

        return `
═══════════════════════════════════
   CLIF-C ACLF 계산 결과
═══════════════════════════════════
계산일시: ${dateStr}

【환자 정보】
  - 나이(Age): ${result.inputs.age}세
  - WBC: ${Utils.formatNumber(result.inputs.wbc)} cells/uL

【입력 수치】
  - Bilirubin: ${result.inputs.bilirubin} mg/dL
  - Creatinine: ${result.inputs.creatinine} mg/dL ${result.inputs.isRRT ? '(RRT 중)' : ''}
  - HE Grade: ${result.inputs.heGrade}
  - INR: ${result.inputs.inr}
${bpText}
${oxygenText}
${o2Text}
  - FiO₂: ${result.inputs.fio2 || '-'}%
${pfText}

【CLIF-C OF Score: ${result.ofScore}/18】
${organScoreText}

【CLIF-C ACLF Score】
  점수: ${result.aclfScore}
  등급: ${result.aclfGrade.grade} (${result.aclfGrade.count}개 장기부전)

【예후 예측】
  위험도: ${result.prognosis.message}
  28일 사망률: ${result.prognosis.mortality28}
  90일 사망률: ${result.prognosis.mortality90}

═══════════════════════════════════
※ 본 결과는 참고용이며, 최종 진단은
   전문의와 상담하세요.
═══════════════════════════════════
`.trim();
    },

    /**
     * 장기별 점수 포맷팅
     * @private
     */
    _formatOrganScores(organScores) {
        return Object.entries(organScores)
            .map(([organ, score]) => `  - ${Calculator.organNames[organ]}: ${score}점`)
            .join('\n');
    },

    /**
     * 혈압 정보 포맷팅
     * @private
     */
    _formatBloodPressure(inputs) {
        const vasopressorText = inputs.isVasopressors ? '(승압제 사용)' : '';

        if (inputs.sbp !== undefined) {
            return `  - SBP/DBP: ${inputs.sbp}/${inputs.dbp} mmHg → MAP ${inputs.map} mmHg ${vasopressorText}`;
        }
        return `  - MAP: ${inputs.map} mmHg ${vasopressorText}`;
    },

    /**
     * 산소화 지표 포맷팅
     * @private
     */
    _formatOxygenation(inputs) {
        if (inputs.oxygenType === 'spo2') {
            const estimatedPao2 = inputs.estimatedPao2
                ? Math.round(inputs.estimatedPao2)
                : '-';
            return `  - SpO₂: ${inputs.spo2 || '-'}%
  - 추정 PaO₂: ${estimatedPao2} mmHg (SpO₂ 기반 추정)`;
        }
        return `  - PaO₂: ${inputs.pao2 || '-'} mmHg`;
    },

    /**
     * O2 유량 포맷팅
     * @private
     */
    _formatO2Flow(inputs) {
        if (inputs.o2flowText) {
            return `  - O₂ 유량: ${inputs.o2flowText}`;
        }
        return `  - O₂ 유량: ${inputs.o2flow || 0} L/min`;
    },

    /**
     * P/F ratio 포맷팅
     * @private
     */
    _formatPFRatio(inputs) {
        const pfValue = Math.round(inputs.pf);
        if (inputs.oxygenType === 'spo2') {
            return `  - P/F ratio (추정): ${pfValue}`;
        }
        return `  - P/F ratio: ${pfValue}`;
    },

    /**
     * Fallback 복사 방법 (execCommand)
     * @param {string} text - 복사할 텍스트
     * @returns {boolean} 성공 여부
     */
    fallbackCopy(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;

            // 화면에서 숨기기
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            textArea.style.opacity = '0';

            document.body.appendChild(textArea);

            // iOS Safari 대응
            if (navigator.userAgent.match(/ipad|iphone/i)) {
                const range = document.createRange();
                range.selectNodeContents(textArea);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                textArea.setSelectionRange(0, 999999);
            } else {
                textArea.select();
            }

            const success = document.execCommand('copy');
            document.body.removeChild(textArea);

            return success;
        } catch (error) {
            console.error('Fallback 복사 실패:', error);
            return false;
        }
    },

    /**
     * 클립보드 API 지원 여부 확인
     * @returns {boolean} 지원 여부
     */
    isSupported() {
        return !!(navigator.clipboard && navigator.clipboard.writeText) ||
               document.queryCommandSupported('copy');
    }
};

// 모듈 내보내기
if (typeof window !== 'undefined') {
    window.Clipboard = Clipboard;
}
