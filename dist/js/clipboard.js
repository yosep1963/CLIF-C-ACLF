/**
 * CLIF-C ACLF Score Calculator
 * 클립보드 복사 모듈
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
        const date = new Date(result.timestamp);
        const dateStr = date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const organScoreText = Object.entries(result.organScores)
            .map(([organ, score]) => `  - ${Calculator.organNames[organ]}: ${score}점`)
            .join('\n');

        return `
═══════════════════════════════════
   CLIF-C ACLF 계산 결과
═══════════════════════════════════
계산일시: ${dateStr}

【환자 정보】
  - 나이(Age): ${result.inputs.age}세
  - WBC: ${result.inputs.wbc.toLocaleString()} cells/uL

【입력 수치】
  - Bilirubin: ${result.inputs.bilirubin} mg/dL
  - Creatinine: ${result.inputs.creatinine} mg/dL ${result.inputs.isRRT ? '(RRT 중)' : ''}
  - HE Grade: ${result.inputs.heGrade}
  - INR: ${result.inputs.inr}
  - MAP: ${result.inputs.map} mmHg ${result.inputs.isVasopressors ? '(승압제 사용)' : ''}
  - PaO₂: ${result.inputs.pao2 || '-'} mmHg
  - FiO₂: ${result.inputs.fio2 || '-'}%
  - P/F ratio: ${Math.round(result.inputs.pf)}

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
     * Fallback 복사 방법 (execCommand)
     * @param {string} text - 복사할 텍스트
     * @returns {boolean} 성공 여부
     */
    fallbackCopy(text) {
        try {
            // 임시 textarea 생성
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

            // 복사 실행
            const success = document.execCommand('copy');

            // 정리
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

// 모듈 내보내기 (브라우저 환경)
if (typeof window !== 'undefined') {
    window.Clipboard = Clipboard;
}
