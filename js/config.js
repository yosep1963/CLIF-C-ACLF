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
        o2flow: { min: 0, max: 6, unit: 'L/min' }
    },

    // FiO2 계산 상수
    FIO2: {
        ROOM_AIR: 21,       // Room air FiO2 (%)
        PER_LITER: 4,       // 1 L/min당 증가량 (%)
        MAX: 45             // 최대 FiO2 (%, Nasal cannula 6L 기준)
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

    // 장기부전/장기기능장애 판정 기준 (EASL-CLIF)
    // 모든 장기: score 3 = Organ Failure, score 2 = Dysfunction
    ORGAN_FAILURE_SCORE: 3,
    ORGAN_DYSFUNCTION_SCORE: 2,

    // ACLF Grade 결정 기준
    ACLF_GRADES: {
        NO_ACLF: { label: 'No ACLF' },
        GRADE_1: { label: 'ACLF-1' },
        GRADE_2: { label: 'ACLF-2' },
        GRADE_3: { label: 'ACLF-3' }
    },

    // Grade별 사망률 (CANONIC study, Moreau et al. 2013)
    GRADE_MORTALITY: {
        'No ACLF': {
            mortality28: '~5%',
            mortality90: '~14%'
        },
        'ACLF-1': {
            mortality28: '~22%',
            mortality90: '~41%'
        },
        'ACLF-2': {
            mortality28: '~32%',
            mortality90: '~52%'
        },
        'ACLF-3': {
            mortality28: '~74%',
            mortality90: '~79%'
        }
    },

    // Score 기반 예후 예측 기준 (5단계)
    PROGNOSIS: {
        VERY_LOW: {
            level: 'very-low',
            message: '저위험군',
            mortality28: '5-10%',
            mortality90: '10-20%',
            color: '#155724',
            bgColor: '#d4edda'
        },
        LOW: {
            level: 'low',
            message: '저-중위험군',
            mortality28: '15-25%',
            mortality90: '30-40%',
            color: '#28a745',
            bgColor: '#d4edda'
        },
        MODERATE: {
            level: 'moderate',
            message: '중위험군',
            mortality28: '35-45%',
            mortality90: '50-60%',
            color: '#856404',
            bgColor: '#fff3cd'
        },
        HIGH: {
            level: 'high',
            message: '고위험군',
            mortality28: '60-70%',
            mortality90: '70-80%',
            color: '#721c24',
            bgColor: '#f8d7da'
        },
        VERY_HIGH: {
            level: 'very-high',
            message: '극고위험군 (Futility 고려)',
            mortality28: '90-100%',
            mortality90: '95-100%',
            color: '#4a0000',
            bgColor: '#f5c6cb'
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
    },

    // 장기명 한글 약칭 (결과 표시용)
    ORGAN_SHORT_NAMES: {
        liver: '간',
        kidney: '신장',
        brain: '뇌',
        coagulation: '응고',
        circulation: '순환',
        respiration: '호흡'
    }
};

// 모듈 내보내기
if (typeof window !== 'undefined') {
    window.Config = Config;
}
