/**
 * CLIF-C ACLF Score Calculator
 * 계산 로직 모듈
 */

const Calculator = {
    /**
     * 각 장기별 OF Score 계산
     * @param {Object} inputs - 입력값 객체
     * @returns {Object} 장기별 점수
     */
    calculateOrganScores(inputs) {
        const scores = {};

        // 1. 간 (Liver) - Bilirubin
        if (inputs.bilirubin < 6) {
            scores.liver = 1;
        } else if (inputs.bilirubin <= 12) {
            scores.liver = 2;
        } else {
            scores.liver = 3;
        }

        // 2. 신장 (Kidney) - Creatinine + RRT
        if (inputs.isRRT) {
            scores.kidney = 3;
        } else {
            if (inputs.creatinine < 2) {
                scores.kidney = 1;
            } else if (inputs.creatinine <= 3.5) {
                scores.kidney = 2;
            } else {
                scores.kidney = 3;
            }
        }

        // 3. 뇌 (Brain) - HE Grade
        if (inputs.heGrade === 0) {
            scores.brain = 1;
        } else if (inputs.heGrade <= 2) {
            scores.brain = 2;
        } else {
            scores.brain = 3;
        }

        // 4. 응고 (Coagulation) - INR
        if (inputs.inr < 2.0) {
            scores.coagulation = 1;
        } else if (inputs.inr <= 2.5) {
            scores.coagulation = 2;
        } else {
            scores.coagulation = 3;
        }

        // 5. 순환 (Circulation) - MAP + Vasopressors
        if (inputs.isVasopressors) {
            scores.circulation = 3;
        } else {
            if (inputs.map >= 70) {
                scores.circulation = 1;
            } else {
                scores.circulation = 2;
            }
        }

        // 6. 호흡 (Respiration) - PaO2/FiO2
        if (inputs.pf > 300) {
            scores.respiration = 1;
        } else if (inputs.pf >= 200) {
            scores.respiration = 2;
        } else {
            scores.respiration = 3;
        }

        return scores;
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
        if (score < 45) {
            return {
                level: 'low',
                color: '#28a745', // 초록색
                bgColor: '#d4edda',
                mortality28: '약 10%',
                mortality90: '약 20%',
                message: '비교적 양호한 예후'
            };
        } else if (score <= 60) {
            return {
                level: 'moderate',
                color: '#856404', // 노란색 텍스트
                bgColor: '#fff3cd',
                mortality28: '30-40%',
                mortality90: '약 50%',
                message: '중등도 위험군'
            };
        } else {
            return {
                level: 'high',
                color: '#721c24', // 빨간색 텍스트
                bgColor: '#f8d7da',
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
    },

    /**
     * 장기 이름 매핑 (한국어 + 영어)
     */
    organNames: {
        liver: '간 (Liver)',
        kidney: '신장 (Kidney)',
        brain: '뇌 (Brain)',
        coagulation: '응고 (Coagulation)',
        circulation: '순환 (Circulation)',
        respiration: '호흡 (Respiration)'
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
    }
};

// 모듈 내보내기 (브라우저 환경)
if (typeof window !== 'undefined') {
    window.Calculator = Calculator;
}
