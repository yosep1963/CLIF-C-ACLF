/**
 * CLIF-C ACLF Score Calculator
 * 메인 앱 로직
 */

(function() {
    'use strict';

    // DOM 요소 캐싱
    const elements = {
        form: document.getElementById('calculator-form'),
        resultSection: document.getElementById('result-section'),
        ofScore: document.getElementById('of-score'),
        organBreakdown: document.getElementById('organ-breakdown'),
        aclfScore: document.getElementById('aclf-score'),
        aclfGrade: document.getElementById('aclf-grade'),
        prognosisCard: document.getElementById('prognosis-card'),
        prognosisContent: document.getElementById('prognosis-content'),
        copyBtn: document.getElementById('copy-btn'),
        historyList: document.getElementById('history-list'),
        clearHistoryBtn: document.getElementById('clear-history'),
        toast: document.getElementById('toast'),
        pfResult: document.getElementById('pf-result'),
        pfRatio: document.getElementById('pf-ratio'),
        // 입력 필드
        inputs: {
            age: document.getElementById('age'),
            wbc: document.getElementById('wbc'),
            bilirubin: document.getElementById('bilirubin'),
            creatinine: document.getElementById('creatinine'),
            rrt: document.getElementById('rrt'),
            heGrade: document.getElementById('heGrade'),
            inr: document.getElementById('inr'),
            map: document.getElementById('map'),
            vasopressors: document.getElementById('vasopressors'),
            pao2: document.getElementById('pao2'),
            fio2: document.getElementById('fio2')
        }
    };

    // 현재 계산 결과 저장
    let currentResult = null;

    /**
     * 앱 초기화
     */
    function init() {
        // 이벤트 리스너 등록
        elements.form.addEventListener('submit', handleSubmit);
        elements.form.addEventListener('reset', handleReset);
        elements.copyBtn.addEventListener('click', handleCopy);
        elements.clearHistoryBtn.addEventListener('click', handleClearHistory);

        // 서비스 워커 등록
        registerServiceWorker();

        // 이력 표시
        renderHistory();

        // 입력 필드 실시간 검증
        Object.values(elements.inputs).forEach(input => {
            if (input && input.type === 'number') {
                input.addEventListener('input', validateInput);
            }
        });

        // PaO2/FiO2 자동 계산
        elements.inputs.pao2.addEventListener('input', updatePFRatio);
        elements.inputs.fio2.addEventListener('input', updatePFRatio);
    }

    /**
     * PaO2/FiO2 ratio 자동 계산 및 표시
     */
    function updatePFRatio() {
        const pao2 = parseFloat(elements.inputs.pao2.value) || 0;
        const fio2 = parseFloat(elements.inputs.fio2.value) || 0;

        if (pao2 > 0 && fio2 >= 21) {
            // FiO2는 %로 입력받으므로 /100
            const ratio = pao2 / (fio2 / 100);
            const roundedRatio = Math.round(ratio);

            elements.pfRatio.textContent = roundedRatio;

            // 점수에 따른 색상 표시
            let scoreClass = '';
            if (roundedRatio > 300) {
                scoreClass = 'score-1';
            } else if (roundedRatio >= 200) {
                scoreClass = 'score-2';
            } else {
                scoreClass = 'score-3';
            }

            elements.pfResult.className = 'calculated-value ' + scoreClass;
        } else {
            elements.pfRatio.textContent = '--';
            elements.pfResult.className = 'calculated-value';
        }
    }

    /**
     * P/F ratio 계산
     */
    function calculatePFRatio() {
        const pao2 = parseFloat(elements.inputs.pao2.value) || 0;
        const fio2 = parseFloat(elements.inputs.fio2.value) || 0;

        if (pao2 > 0 && fio2 >= 21) {
            return pao2 / (fio2 / 100);
        }
        return 0;
    }

    /**
     * 폼 제출 처리
     */
    function handleSubmit(e) {
        e.preventDefault();

        // 입력값 수집
        const inputs = getInputValues();

        // 유효성 검사
        if (!validateInputs(inputs)) {
            return;
        }

        // 계산 실행
        currentResult = Calculator.calculate(inputs);

        // 결과 표시
        displayResults(currentResult);

        // 이력에 저장
        Storage.saveToHistory(currentResult);
        renderHistory();

        // 결과 섹션으로 스크롤
        elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * 입력값 수집
     */
    function getInputValues() {
        const pao2 = parseFloat(elements.inputs.pao2.value) || 0;
        const fio2 = parseFloat(elements.inputs.fio2.value) || 0;
        const pf = calculatePFRatio();

        return {
            age: parseFloat(elements.inputs.age.value) || 0,
            wbc: parseFloat(elements.inputs.wbc.value) || 0,
            bilirubin: parseFloat(elements.inputs.bilirubin.value) || 0,
            creatinine: parseFloat(elements.inputs.creatinine.value) || 0,
            isRRT: elements.inputs.rrt.checked,
            heGrade: parseInt(elements.inputs.heGrade.value) || 0,
            inr: parseFloat(elements.inputs.inr.value) || 0,
            map: parseFloat(elements.inputs.map.value) || 0,
            isVasopressors: elements.inputs.vasopressors.checked,
            pao2: pao2,
            fio2: fio2,
            pf: pf
        };
    }

    /**
     * 입력값 유효성 검사
     */
    function validateInputs(inputs) {
        const errors = [];

        if (inputs.age < 18 || inputs.age > 100) {
            errors.push('나이는 18-100세 범위여야 합니다.');
        }
        if (inputs.wbc < 100 || inputs.wbc > 100000) {
            errors.push('WBC 값을 확인해주세요.');
        }
        if (inputs.bilirubin < 0) {
            errors.push('Bilirubin 값을 확인해주세요.');
        }
        if (inputs.creatinine < 0) {
            errors.push('Creatinine 값을 확인해주세요.');
        }
        if (elements.inputs.heGrade.value === '') {
            errors.push('HE Grade를 선택해주세요.');
        }
        if (inputs.inr < 0) {
            errors.push('INR 값을 확인해주세요.');
        }
        if (inputs.map < 20 || inputs.map > 200) {
            errors.push('MAP 값을 확인해주세요.');
        }
        if (inputs.pao2 <= 0 || inputs.pao2 > 600) {
            errors.push('PaO₂ 값을 확인해주세요 (0-600 mmHg).');
        }
        if (inputs.fio2 < 21 || inputs.fio2 > 100) {
            errors.push('FiO₂ 값을 확인해주세요 (21-100%).');
        }

        if (errors.length > 0) {
            showToast(errors[0]);
            return false;
        }

        return true;
    }

    /**
     * 개별 입력 필드 검증
     */
    function validateInput(e) {
        const input = e.target;
        const value = parseFloat(input.value);
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);

        if (value < min || value > max) {
            input.style.borderColor = '#dc3545';
        } else {
            input.style.borderColor = '';
        }
    }

    /**
     * 결과 표시
     */
    function displayResults(result) {
        // 결과 섹션 표시
        elements.resultSection.classList.remove('hidden');

        // OF Score 표시
        elements.ofScore.innerHTML = `
            <span class="value">${result.ofScore}</span>
            <span class="unit">/ 18</span>
        `;

        // 장기별 점수 표시
        elements.organBreakdown.innerHTML = Object.entries(result.organScores)
            .map(([organ, score]) => `
                <div class="organ-item">
                    <span class="organ-name">${Calculator.organNames[organ]}</span>
                    <span class="organ-score">
                        <span class="indicator score-${score}"></span>
                        <span class="value">${score}점</span>
                    </span>
                </div>
            `).join('');

        // ACLF Score 표시
        elements.aclfScore.innerHTML = `<span class="value">${result.aclfScore}</span>`;

        // ACLF Grade 표시
        elements.aclfGrade.textContent = `${result.aclfGrade.grade} (${result.aclfGrade.count}개 장기부전)`;

        // 예후 카드 스타일 적용
        elements.prognosisCard.className = `result-card prognosis-card prognosis-${result.prognosis.level}`;

        // 예후 내용 표시
        elements.prognosisContent.innerHTML = `
            <div class="prognosis-level" style="background-color: ${result.prognosis.bgColor}; color: ${result.prognosis.color};">
                ${result.prognosis.message}
            </div>
            <div class="mortality-info">
                <div class="mortality-item">
                    <div class="label">28일 사망률</div>
                    <div class="value" style="color: ${result.prognosis.color};">${result.prognosis.mortality28}</div>
                </div>
                <div class="mortality-item">
                    <div class="label">90일 사망률</div>
                    <div class="value" style="color: ${result.prognosis.color};">${result.prognosis.mortality90}</div>
                </div>
            </div>
        `;
    }

    /**
     * 폼 초기화 처리
     */
    function handleReset() {
        // 결과 섹션 숨기기
        setTimeout(() => {
            elements.resultSection.classList.add('hidden');
            currentResult = null;
            // 입력 필드 스타일 초기화
            Object.values(elements.inputs).forEach(input => {
                if (input) {
                    input.style.borderColor = '';
                }
            });
            // P/F ratio 초기화
            elements.pfRatio.textContent = '--';
            elements.pfResult.className = 'calculated-value';
        }, 0);
    }

    /**
     * 결과 복사 처리
     */
    async function handleCopy() {
        if (!currentResult) {
            showToast('계산 결과가 없습니다.');
            return;
        }

        const success = await Clipboard.copyResult(currentResult);

        if (success) {
            elements.copyBtn.classList.add('copied');
            elements.copyBtn.textContent = '복사 완료!';
            showToast('클립보드에 복사되었습니다.');

            setTimeout(() => {
                elements.copyBtn.classList.remove('copied');
                elements.copyBtn.textContent = '결과 클립보드에 복사';
            }, 2000);
        } else {
            showToast('복사에 실패했습니다.');
        }
    }

    /**
     * 이력 삭제 처리
     */
    function handleClearHistory() {
        if (confirm('모든 계산 이력을 삭제하시겠습니까?')) {
            Storage.clearHistory();
            renderHistory();
            showToast('이력이 삭제되었습니다.');
        }
    }

    /**
     * 이력 표시
     */
    function renderHistory() {
        const history = Storage.getHistory();

        if (history.length === 0) {
            elements.historyList.innerHTML = '<p class="history-empty">저장된 이력이 없습니다.</p>';
            elements.clearHistoryBtn.style.display = 'none';
            return;
        }

        elements.clearHistoryBtn.style.display = 'block';

        elements.historyList.innerHTML = history.map((item, index) => {
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="history-item" data-index="${index}">
                    <div class="history-info">
                        <span class="history-score">ACLF Score: ${item.aclfScore}</span>
                        <span class="history-date">${dateStr}</span>
                    </div>
                    <span class="history-grade grade-${item.prognosis.level}">${item.aclfGrade.grade}</span>
                </div>
            `;
        }).join('');

        // 이력 아이템 클릭 이벤트
        elements.historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const historyItem = history[index];
                loadHistoryItem(historyItem);
            });
        });
    }

    /**
     * 이력 아이템 불러오기
     */
    function loadHistoryItem(item) {
        // 입력값 복원
        elements.inputs.age.value = item.inputs.age;
        elements.inputs.wbc.value = item.inputs.wbc;
        elements.inputs.bilirubin.value = item.inputs.bilirubin;
        elements.inputs.creatinine.value = item.inputs.creatinine;
        elements.inputs.rrt.checked = item.inputs.isRRT;
        elements.inputs.heGrade.value = item.inputs.heGrade;
        elements.inputs.inr.value = item.inputs.inr;
        elements.inputs.map.value = item.inputs.map;
        elements.inputs.vasopressors.checked = item.inputs.isVasopressors;

        // PaO2/FiO2 복원
        if (item.inputs.pao2 !== undefined) {
            elements.inputs.pao2.value = item.inputs.pao2;
            elements.inputs.fio2.value = item.inputs.fio2;
        } else {
            // 이전 버전 호환성 (pf만 저장된 경우)
            // 기본 FiO2 21%로 가정하고 PaO2 역산
            elements.inputs.fio2.value = 21;
            elements.inputs.pao2.value = Math.round(item.inputs.pf * 0.21);
        }

        // P/F ratio 업데이트
        updatePFRatio();

        // 결과 표시
        currentResult = item;
        displayResults(item);

        // 상단으로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });

        showToast('이전 계산을 불러왔습니다.');
    }

    /**
     * 토스트 메시지 표시
     */
    function showToast(message, duration = 2500) {
        elements.toast.textContent = message;
        elements.toast.classList.add('show');

        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, duration);
    }

    /**
     * 서비스 워커 등록
     */
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker 등록 성공:', registration.scope);
                    })
                    .catch(error => {
                        console.log('ServiceWorker 등록 실패:', error);
                    });
            });
        }
    }

    // DOM 로드 완료 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
