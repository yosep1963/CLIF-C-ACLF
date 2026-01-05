/**
 * CLIF-C ACLF Score Calculator
 * 설정 및 상수 정의
 */

const Config = {
    // 앱 버전
    VERSION: '1.2.0',

    // 입력값 범위 설정
    INPUT_RANGES: {
        age: { min: 18, max: 100, unit: '세' },
        wbc: { min: 100, max: 100000, unit: 'cells/uL' },
        bilirubin: { min: 0, max: 100, unit: 'mg/dL' },
        creatinine: { min: 0, max: 30, unit: 'mg/dL' },
        inr: { min: 0, max: 20, unit: '' },
        sbp: { min: 40, max: 300, unit: 'mmHg' },
        dbp: { min: 20, max: 200, unit: 'mmHg' },
        map: { min: 20, max: 200, unit: 'mmHg' },
        pao2: { min: 30, max: 600, unit: 'mmHg' },
        spo2: { min: 70, max: 100, unit: '%' },
        o2flow: { min: 0, max: 5, unit: 'L/min' }
    },

    // SpO2 → PaO2 변환 상수 (경험적 공식)
    SPO2_CONVERSION: {
        COEFFICIENT: 22,
        EXPONENT: 0.0308
    },

    // FiO2 계산 상수
    FIO2: {
        ROOM_AIR: 21,       // Room air FiO2 (%)
        PER_LITER: 4,       // 1 L/min당 증가량 (%)
        MAX: 40             // 최대 FiO2 (%, Nasal cannula 기준)
    },

    // 점수 기준값
    SCORE_THRESHOLDS: {
        // Bilirubin (mg/dL)
        bilirubin: {
            score1: { max: 6 },      // < 6
            score2: { min: 6, max: 12 }, // 6-12
            score3: { min: 12 }      // > 12
        },
        // Creatinine (mg/dL)
        creatinine: {
            score1: { max: 2 },      // < 2
            score2: { min: 2, max: 3.5 }, // 2-3.5
            score3: { min: 3.5 }     // > 3.5
        },
        // INR
        inr: {
            score1: { max: 2 },      // < 2.0
            score2: { min: 2, max: 2.5 }, // 2.0-2.5
            score3: { min: 2.5 }     // > 2.5
        },
        // MAP (mmHg)
        map: {
            score1: { min: 70 },     // >= 70
            score2: { max: 70 }      // < 70
        },
        // P/F ratio
        pf: {
            score1: { min: 300 },    // > 300
            score2: { min: 200, max: 300 }, // 200-300
            score3: { max: 200 }     // <= 200
        }
    },

    // HE Grade 매핑
    HE_GRADE_SCORES: {
        0: 1,  // Grade 0 → 1점
        1: 2,  // Grade 1 → 2점
        2: 2,  // Grade 2 → 2점
        3: 3,  // Grade 3 → 3점
        4: 3   // Grade 4 → 3점
    },

    // ACLF Grade 결정 기준
    ACLF_GRADES: {
        NO_ACLF: { minOF: 0, maxOF: 6, label: 'No ACLF' },
        GRADE_1: { organs: 1, label: 'ACLF Grade 1' },
        GRADE_2: { organs: 2, label: 'ACLF Grade 2' },
        GRADE_3: { organs: [3, 4, 5, 6], label: 'ACLF Grade 3' }
    },

    // 예후 예측 기준
    PROGNOSIS: {
        LOW: {
            maxScore: 50,
            level: 'low',
            message: '저위험군',
            mortality28: '< 20%',
            mortality90: '< 30%',
            color: '#28a745',
            bgColor: '#d4edda'
        },
        MODERATE: {
            minScore: 51,
            maxScore: 60,
            level: 'moderate',
            message: '중위험군',
            mortality28: '20-50%',
            mortality90: '30-60%',
            color: '#856404',
            bgColor: '#fff3cd'
        },
        HIGH: {
            minScore: 61,
            level: 'high',
            message: '고위험군',
            mortality28: '> 50%',
            mortality90: '> 70%',
            color: '#721c24',
            bgColor: '#f8d7da'
        }
    },

    // 저장소 설정
    STORAGE: {
        KEY: 'clif_c_aclf_history',
        MAX_HISTORY: 10
    },

    // 장기명 한글 매핑
    ORGAN_NAMES: {
        liver: '간 (Liver)',
        kidney: '신장 (Kidney)',
        brain: '뇌 (Brain)',
        coagulation: '응고 (Coagulation)',
        circulation: '순환 (Circulation)',
        respiration: '호흡 (Respiration)'
    }
};

// 모듈 내보내기
if (typeof window !== 'undefined') {
    window.Config = Config;
}
