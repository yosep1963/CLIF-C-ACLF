/**
 * CLIF-C ACLF Score Calculator
 * 유효성 검사 모듈
 */

const Validator = {
    /**
     * 유효성 검사 규칙 정의
     * 각 필드별 검사 함수 반환
     */
    rules: {
        age: (v) => Utils.isInRange(v, Config.INPUT_RANGES.age.min, Config.INPUT_RANGES.age.max),
        wbc: (v) => Utils.isInRange(v, Config.INPUT_RANGES.wbc.min, Config.INPUT_RANGES.wbc.max),
        bilirubin: (v) => v >= Config.INPUT_RANGES.bilirubin.min,
        creatinine: (v) => v >= Config.INPUT_RANGES.creatinine.min,
        heGrade: (v) => v !== '' && v !== null && v !== undefined,
        inr: (v) => v >= Config.INPUT_RANGES.inr.min,
        sbp: (v) => Utils.isInRange(v, Config.INPUT_RANGES.sbp.min, Config.INPUT_RANGES.sbp.max),
        dbp: (v) => Utils.isInRange(v, Config.INPUT_RANGES.dbp.min, Config.INPUT_RANGES.dbp.max),
        map: (v) => Utils.isInRange(v, Config.INPUT_RANGES.map.min, Config.INPUT_RANGES.map.max),
        pao2: (v) => Utils.isInRange(v, Config.INPUT_RANGES.pao2.min, Config.INPUT_RANGES.pao2.max),
        spo2: (v) => Utils.isInRange(v, Config.INPUT_RANGES.spo2.min, Config.INPUT_RANGES.spo2.max),
        o2flow: (v) => Utils.isInRange(v, Config.INPUT_RANGES.o2flow.min, Config.INPUT_RANGES.o2flow.max)
    },

    /**
     * 오류 메시지 정의
     */
    messages: {
        age: `나이는 ${Config.INPUT_RANGES.age.min}-${Config.INPUT_RANGES.age.max}세 범위여야 합니다.`,
        wbc: 'WBC 값을 확인해주세요.',
        bilirubin: 'Bilirubin 값을 확인해주세요.',
        creatinine: 'Creatinine 값을 확인해주세요.',
        heGrade: 'HE Grade를 선택해주세요.',
        inr: 'INR 값을 확인해주세요.',
        sbp: `SBP 값을 확인해주세요 (${Config.INPUT_RANGES.sbp.min}-${Config.INPUT_RANGES.sbp.max} mmHg).`,
        dbp: `DBP 값을 확인해주세요 (${Config.INPUT_RANGES.dbp.min}-${Config.INPUT_RANGES.dbp.max} mmHg).`,
        map: '계산된 MAP 값이 유효하지 않습니다.',
        pao2: `PaO₂ 값을 확인해주세요 (${Config.INPUT_RANGES.pao2.min}-${Config.INPUT_RANGES.pao2.max} mmHg).`,
        spo2: `SpO₂ 값을 확인해주세요 (${Config.INPUT_RANGES.spo2.min}-${Config.INPUT_RANGES.spo2.max}%).`,
        o2flow: `O₂ 유량을 확인해주세요 (${Config.INPUT_RANGES.o2flow.min}-${Config.INPUT_RANGES.o2flow.max} L/min).`
    },

    /**
     * 전체 입력값 유효성 검사
     * @param {Object} inputs - 입력값 객체
     * @returns {Object} { isValid: boolean, errors: string[] }
     */
    validate(inputs) {
        const errors = [];

        // 기본 필드 검사
        const basicFields = ['age', 'wbc', 'bilirubin', 'creatinine', 'inr'];
        basicFields.forEach(field => {
            if (!this.rules[field](inputs[field])) {
                errors.push(this.messages[field]);
            }
        });

        // HE Grade 검사 (특수 처리)
        if (!this.rules.heGrade(inputs.heGrade)) {
            errors.push(this.messages.heGrade);
        }

        // 혈압 검사
        if (!this.rules.sbp(inputs.sbp)) {
            errors.push(this.messages.sbp);
        }
        if (!this.rules.dbp(inputs.dbp)) {
            errors.push(this.messages.dbp);
        }
        if (!this.rules.map(inputs.map)) {
            errors.push(this.messages.map);
        }

        // 산소화 지표 검사 (PaO2 또는 SpO2)
        if (inputs.oxygenType === 'pao2') {
            if (inputs.pao2 === null || !this.rules.pao2(inputs.pao2)) {
                errors.push(this.messages.pao2);
            }
        } else {
            if (inputs.spo2 === null || !this.rules.spo2(inputs.spo2)) {
                errors.push(this.messages.spo2);
            }
        }

        // O2 유량 검사
        if (!this.rules.o2flow(inputs.o2flow)) {
            errors.push(this.messages.o2flow);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * 단일 필드 유효성 검사
     * @param {string} field - 필드명
     * @param {any} value - 값
     * @returns {boolean}
     */
    validateField(field, value) {
        if (this.rules[field]) {
            return this.rules[field](value);
        }
        return true;
    },

    /**
     * 입력 필드 범위 검사 (시각적 피드백용)
     * @param {HTMLInputElement} input - 입력 요소
     * @returns {boolean}
     */
    validateInputElement(input) {
        const value = Utils.parseNumber(input.value);
        const min = Utils.parseNumber(input.min, -Infinity);
        const max = Utils.parseNumber(input.max, Infinity);

        const isValid = Utils.isInRange(value, min, max);

        if (!isValid) {
            input.style.borderColor = '#dc3545';
        } else {
            input.style.borderColor = '';
        }

        return isValid;
    }
};

// 모듈 내보내기
if (typeof window !== 'undefined') {
    window.Validator = Validator;
}
