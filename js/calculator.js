/**
 * CLIF-C ACLF Score Calculator
 * 계산 로직 모듈 (리팩터링 버전)
 */

const Calculator = {
    /**
     * 장기 이름 매핑 (Config에서 가져옴)
     */
    get organNames() {
        return Config.ORGAN_NAMES;
    },

    /**
     * 장기별 지표 이름
     */
    organIndicators: {
        liver: 'Bilirubin',
        kidney: 'Creatinine',
        brain: 'HE Grade',
        coagulation: 'INR',
        circulation: 'MAP',
        respiration: 'PaO₂/FiO₂'
    },

    /**
     * 각 장기별 OF Score 계산
     * @param {Object} inputs - 입력값 객체
     * @returns {Object} 장기별 점수
     */
    calculateOrganScores(inputs) {
        const scores = {};
        const thresholds = Config.SCORE_THRESHOLDS;

        // 1. 간 (Liver) - Bilirubin
        scores.liver = this._calculateLiverScore(inputs.bilirubin, thresholds.bilirubin);

        // 2. 신장 (Kidney) - Creatinine + RRT
        scores.kidney = this._calculateKidneyScore(inputs.creatinine, inputs.isRRT, thresholds.creatinine);

        // 3. 뇌 (Brain) - HE Grade
        scores.brain = this._calculateBrainScore(inputs.heGrade);

        // 4. 응고 (Coagulation) - INR
        scores.coagulation = this._calculateCoagulationScore(inputs.inr, thresholds.inr);

        // 5. 순환 (Circulation) - MAP + Vasopressors
        scores.circulation = this._calculateCirculationScore(inputs.map, inputs.isVasopressors);

        // 6. 호흡 (Respiration) - PaO2/FiO2
        scores.respiration = this._calculateRespirationScore(inputs.pf, thresholds.pf);

        return scores;
    },

    /**
     * 간 점수 계산
     * @private
     */
    _calculateLiverScore(bilirubin, thresholds) {
        if (bilirubin < thresholds.score1.max) return 1;
        if (bilirubin <= thresholds.score2.max) return 2;
        return 3;
    },

    /**
     * 신장 점수 계산
     * @private
     */
    _calculateKidneyScore(creatinine, isRRT, thresholds) {
        if (isRRT) return 3;
        if (creatinine < thresholds.score1.max) return 1;
        if (creatinine <= thresholds.score2.max) return 2;
        return 3;
    },

    /**
     * 뇌 점수 계산 (HE Grade 기반)
     * @private
     */
    _calculateBrainScore(heGrade) {
        return Config.HE_GRADE_SCORES[heGrade] || 1;
    },

    /**
     * 응고 점수 계산
     * @private
     */
    _calculateCoagulationScore(inr, thresholds) {
        if (inr < thresholds.score1.max) return 1;
        if (inr <= thresholds.score2.max) return 2;
        return 3;
    },

    /**
     * 순환 점수 계산
     * @private
     */
    _calculateCirculationScore(map, isVasopressors) {
        return Utils.getMAPScore(map, isVasopressors);
    },

    /**
     * 호흡 점수 계산
     * @private
     */
    _calculateRespirationScore(pf, thresholds) {
        return Utils.getPFRatioScore(pf);
    },

    /**
     * CLIF-C OF Score 총점 계산
     * @param {Object} organScores - 장기별 점수
     * @returns {number} 총점 (6-18)
     */
    calculateCLIFCOF(organScores) {
        return Object.values(organScores).reduce((sum, score) => sum + score, 0);
    },

    /**
     * CLIF-C ACLF Score 계산
     * 공식: 10 × [0.33 × CLIF-C_OF + 0.04 × Age + 0.63 × ln(WBC/1000) - 2]
     * @param {number} clifcOF - CLIF-C OF Score
     * @param {number} age - 나이
     * @param {number} wbc - WBC (cells/uL)
     * @returns {number} CLIF-C ACLF Score (소수점 1자리)
     */
    calculateCLIFCACLF(clifcOF, age, wbc) {
        // WBC는 cells/uL 단위로 입력받아 /1000 처리
        const wbcInThousands = wbc / 1000;

        // 공식 적용
        const score = 10 * (
            0.33 * clifcOF +
            0.04 * age +
            0.63 * Math.log(wbcInThousands) -
            2
        );

        // 소수점 1자리로 반올림
        return Math.round(score * 10) / 10;
    },

    /**
     * ACLF Grade 결정
     * 장기부전 = 해당 장기 점수 >= 2점
     * @param {Object} organScores - 장기별 점수
     * @returns {Object} grade와 장기부전 개수
     */
    determineACLFGrade(organScores) {
        // 2점 이상인 장기 = 장기부전
        const organFailures = Object.values(organScores).filter(score => score >= 2).length;

        if (organFailures === 0) {
            return { grade: 'No ACLF', count: 0 };
        }
        if (organFailures === 1) {
            return { grade: 'ACLF-1', count: 1 };
        }
        if (organFailures === 2) {
            return { grade: 'ACLF-2', count: 2 };
        }
        return { grade: 'ACLF-3', count: organFailures };
    },

    /**
     * 예후 판정
     * @param {number} score - CLIF-C ACLF Score
     * @returns {Object} 예후 정보
     */
    getPrognosis(score) {
        const prognosis = Config.PROGNOSIS;

        if (score < 45) {
            return {
                ...prognosis.LOW,
                mortality28: '약 10%',
                mortality90: '약 20%',
                message: '비교적 양호한 예후'
            };
        } else if (score <= 60) {
            return {
                ...prognosis.MODERATE,
                mortality28: '30-40%',
                mortality90: '약 50%',
                message: '중등도 위험군'
            };
        } else {
            return {
                ...prognosis.HIGH,
                mortality28: '60-70%',
                mortality90: '약 80%',
                message: '고위험군'
            };
        }
    },

    /**
     * 전체 계산 실행
     * @param {Object} inputs - 모든 입력값
     * @returns {Object} 전체 계산 결과
     */
    calculate(inputs) {
        const organScores = this.calculateOrganScores(inputs);
        const ofScore = this.calculateCLIFCOF(organScores);
        const aclfScore = this.calculateCLIFCACLF(ofScore, inputs.age, inputs.wbc);
        const aclfGrade = this.determineACLFGrade(organScores);
        const prognosis = this.getPrognosis(aclfScore);

        return {
            inputs: { ...inputs },
            organScores,
            ofScore,
            aclfScore,
            aclfGrade,
            prognosis,
            timestamp: new Date().toISOString()
        };
    }
};

// 모듈 내보내기
if (typeof window !== 'undefined') {
    window.Calculator = Calculator;
}
