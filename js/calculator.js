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
     * 장기부전 여부 판정 (EASL-CLIF 기준: score = 3)
     * @param {string} organ - 장기명
     * @param {number} score - CLIF-OF score (1-3)
     * @returns {boolean}
     */
    isOrganFailure(organ, score) {
        return score >= Config.ORGAN_FAILURE_SCORE;
    },

    /**
     * 장기기능장애 여부 판정 (score = 2이면서 부전이 아닌 경우)
     * @param {string} organ - 장기명
     * @param {number} score - CLIF-OF score (1-3)
     * @returns {boolean}
     */
    isOrganDysfunction(organ, score) {
        return !this.isOrganFailure(organ, score) && score >= Config.ORGAN_DYSFUNCTION_SCORE;
    },

    /**
     * 장기부전/장애 목록 반환
     * @param {Object} organScores - 장기별 점수
     * @returns {Object} { failures: string[], dysfunctions: string[] }
     */
    getOrganStatus(organScores) {
        const failures = [];
        const dysfunctions = [];
        for (const [organ, score] of Object.entries(organScores)) {
            if (this.isOrganFailure(organ, score)) {
                failures.push(organ);
            } else if (this.isOrganDysfunction(organ, score)) {
                dysfunctions.push(organ);
            }
        }
        return { failures, dysfunctions };
    },

    /**
     * ACLF Grade 결정 (EASL-CLIF / CANONIC study 기준)
     * - 장기부전(Organ Failure) = CLIF-OF score 3 (모든 장기 동일)
     * - ACLF-1 특별기준:
     *   · 단독 신장부전 → ACLF-1
     *   · 비신장 단일 부전 + 신장기능장애(score 2) 또는 뇌기능장애(score 2) → ACLF-1
     *   · 비신장 단일 부전 단독 → No ACLF
     * - ACLF-2: 2개 장기부전
     * - ACLF-3: 3개 이상 장기부전
     * @param {Object} organScores - 장기별 점수
     * @returns {Object} grade, count, failedOrgans, dysfunctionalOrgans
     */
    determineACLFGrade(organScores) {
        const { failures, dysfunctions } = this.getOrganStatus(organScores);
        const failureCount = failures.length;

        const shortNames = Config.ORGAN_SHORT_NAMES;
        const failedOrgans = failures.map(o => shortNames[o]);
        const dysfunctionalOrgans = dysfunctions.map(o => shortNames[o]);

        if (failureCount === 0) {
            return { grade: 'No ACLF', count: 0, failedOrgans: [], dysfunctionalOrgans };
        }
        if (failureCount >= 3) {
            return { grade: 'ACLF-3', count: failureCount, failedOrgans, dysfunctionalOrgans };
        }
        if (failureCount === 2) {
            return { grade: 'ACLF-2', count: 2, failedOrgans, dysfunctionalOrgans };
        }

        // 1개 장기부전 → ACLF-1 특별기준 적용
        const singleFailureOrgan = failures[0];

        // 단독 신장부전 → ACLF-1
        if (singleFailureOrgan === 'kidney') {
            return { grade: 'ACLF-1', count: 1, failedOrgans, dysfunctionalOrgans };
        }

        // 비신장 단일 부전 + 신장기능장애(score 2) 또는 뇌기능장애(score 2) → ACLF-1
        const hasKidneyDysfunction = organScores.kidney >= Config.ORGAN_DYSFUNCTION_SCORE;
        const hasCerebralDysfunction = organScores.brain >= Config.ORGAN_DYSFUNCTION_SCORE;

        if (hasKidneyDysfunction || hasCerebralDysfunction) {
            return { grade: 'ACLF-1', count: 1, failedOrgans, dysfunctionalOrgans };
        }

        // 비신장 단일 부전 + 신장/뇌 장애 없음 → No ACLF
        return {
            grade: 'No ACLF', count: 0,
            failedOrgans, dysfunctionalOrgans,
            note: '단일 비신장 장기부전이나 신장/뇌 기능장애 없음'
        };
    },

    /**
     * Grade 기반 사망률 반환
     * @param {string} grade - ACLF grade string
     * @returns {Object}
     */
    getGradeMortality(grade) {
        return Config.GRADE_MORTALITY[grade] || Config.GRADE_MORTALITY['No ACLF'];
    },

    /**
     * Score 기반 예후 판정 (5단계)
     * @param {number} score - CLIF-C ACLF Score
     * @returns {Object} 예후 정보
     */
    getPrognosis(score) {
        const p = Config.PROGNOSIS;
        if (score < 40) return { ...p.VERY_LOW };
        if (score < 50) return { ...p.LOW };
        if (score < 60) return { ...p.MODERATE };
        if (score < 70) return { ...p.HIGH };
        return { ...p.VERY_HIGH };
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
        const gradeMortality = this.getGradeMortality(aclfGrade.grade);

        return {
            inputs: { ...inputs },
            organScores,
            ofScore,
            aclfScore,
            aclfGrade,
            prognosis,
            gradeMortality,
            timestamp: new Date().toISOString()
        };
    }
};

// 모듈 내보내기
if (typeof window !== 'undefined') {
    window.Calculator = Calculator;
}
