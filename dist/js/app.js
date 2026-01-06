/**
 * CLIF-C ACLF Score Calculator
 * 메인 앱 로직 (리팩터링 버전)
 */

(function() {
    'use strict';

    // DOM 요소 캐싱
    const elements = {
        form: Utils.getElement('calculator-form'),
        resultSection: Utils.getElement('result-section'),
        ofScore: Utils.getElement('of-score'),
        organBreakdown: Utils.getElement('organ-breakdown'),
        aclfScore: Utils.getElement('aclf-score'),
        aclfGrade: Utils.getElement('aclf-grade'),
        prognosisCard: Utils.getElement('prognosis-card'),
        prognosisContent: Utils.getElement('prognosis-content'),
        copyBtn: Utils.getElement('copy-btn'),
        historyList: Utils.getElement('history-list'),
        clearHistoryBtn: Utils.getElement('clear-history'),
        toast: Utils.getElement('toast'),
        pfResult: Utils.getElement('pf-result'),
        pfRatio: Utils.getElement('pf-ratio'),
        // 입력 필드
        inputs: {
            age: Utils.getElement('age'),
            wbc: Utils.getElement('wbc'),
            bilirubin: Utils.getElement('bilirubin'),
            creatinine: Utils.getElement('creatinine'),
            rrt: Utils.getElement('rrt'),
            heGrade: Utils.getElement('heGrade'),
            inr: Utils.getElement('inr'),
            sbp: Utils.getElement('sbp'),
            dbp: Utils.getElement('dbp'),
            vasopressors: Utils.getElement('vasopressors'),
            pao2: Utils.getElement('pao2'),
            spo2: Utils.getElement('spo2'),
            o2flow: Utils.getElement('o2flow')
        },
        // 산소화 토글 관련 요소
        oxygenToggle: {
            pao2Group: Utils.getElement('pao2-input-group'),
            spo2Group: Utils.getElement('spo2-input-group'),
            warning: Utils.getElement('spo2-warning'),
            toggleBtns: Utils.getElements('.toggle-btn')
        },
        // 계산된 값 표시 요소
        calculated: {
            mapResult: Utils.getElement('map-result'),
            mapValue: Utils.getElement('map-calculated'),
            fio2Result: Utils.getElement('fio2-result'),
            fio2Value: Utils.getElement('fio2-calculated')
        }
    };

    // 현재 계산 결과 저장
    let currentResult = null;

    /**
     * 앱 초기화
     */
    function init() {
        setupEventListeners();
        registerServiceWorker();
        renderHistory();
        updateFiO2Display();
    }

    /**
     * 이벤트 리스너 설정
     */
    function setupEventListeners() {
        // 폼 이벤트
        elements.form.addEventListener('submit', handleSubmit);
        elements.form.addEventListener('reset', handleReset);
        elements.copyBtn.addEventListener('click', handleCopy);
        elements.clearHistoryBtn.addEventListener('click', handleClearHistory);

        // 입력 필드 실시간 검증
        Object.values(elements.inputs).forEach(input => {
            if (input && input.type === 'number') {
                input.addEventListener('input', handleInputValidation);
            }
        });

        // MAP 자동 계산
        elements.inputs.sbp.addEventListener('input', updateMAPDisplay);
        elements.inputs.dbp.addEventListener('input', updateMAPDisplay);
        elements.inputs.vasopressors.addEventListener('change', updateMAPDisplay);

        // FiO2 및 P/F ratio 자동 계산
        elements.inputs.o2flow.addEventListener('input', updateFiO2Display);
        elements.inputs.pao2.addEventListener('input', updatePFRatioDisplay);
        elements.inputs.spo2.addEventListener('input', updatePFRatioDisplay);

        // 산소화 지표 토글
        initOxygenTypeToggle();
    }

    /**
     * 산소화 지표 토글 버튼 초기화
     * 인라인 onclick 핸들러가 주 역할을 담당하고, 이 함수는 백업용
     */
    function initOxygenTypeToggle() {
        // 전역 selectOxygenType 함수가 없으면 백업 리스너 등록
        if (typeof selectOxygenType !== 'function') {
            elements.oxygenToggle.toggleBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    handleOxygenTypeChange(btn.dataset.type);
                });
            });
        }
    }

    /**
     * 현재 선택된 산소화 지표 유형 반환
     */
    function getSelectedOxygenType() {
        const btnPao2 = document.getElementById('btn-pao2');
        const btnSpo2 = document.getElementById('btn-spo2');

        if (btnSpo2 && btnSpo2.classList.contains('active')) {
            return 'spo2';
        }
        return 'pao2';
    }

    /**
     * 산소화 지표 토글 변경 처리
     */
    function handleOxygenTypeChange(oxygenType) {
        const isPao2 = oxygenType === 'pao2';
        elements.oxygenToggle.pao2Group.style.display = isPao2 ? 'block' : 'none';
        elements.oxygenToggle.spo2Group.style.display = isPao2 ? 'none' : 'block';
        elements.oxygenToggle.warning.style.display = isPao2 ? 'none' : 'block';
        updatePFRatioDisplay();
    }

    /**
     * MAP 표시 업데이트
     */
    function updateMAPDisplay() {
        const sbp = Utils.parseNumber(elements.inputs.sbp.value);
        const dbp = Utils.parseNumber(elements.inputs.dbp.value);

        if (sbp > 0 && dbp > 0) {
            const map = Utils.calculateMAP(sbp, dbp);
            elements.calculated.mapValue.textContent = map;

            const score = Utils.getMAPScore(map, elements.inputs.vasopressors.checked);
            elements.calculated.mapResult.className = 'calculated-value ' + Utils.getScoreClass(score);
        } else {
            elements.calculated.mapValue.textContent = '--';
            elements.calculated.mapResult.className = 'calculated-value';
        }
    }

    /**
     * FiO2 표시 업데이트
     */
    function updateFiO2Display() {
        const o2flow = Utils.parseNumber(elements.inputs.o2flow.value);
        const fio2 = Utils.calculateFiO2(o2flow);

        elements.calculated.fio2Value.textContent = fio2;
        elements.calculated.fio2Result.className = 'calculated-value score-1';

        updatePFRatioDisplay();
    }

    /**
     * P/F ratio 표시 업데이트
     */
    function updatePFRatioDisplay() {
        const oxygenType = getSelectedOxygenType();
        const o2flow = Utils.parseNumber(elements.inputs.o2flow.value);
        const fio2 = Utils.calculateFiO2(o2flow);

        let pao2Value;
        if (oxygenType === 'pao2') {
            pao2Value = Utils.parseNumber(elements.inputs.pao2.value);
        } else {
            const spo2 = Utils.parseNumber(elements.inputs.spo2.value);
            pao2Value = Utils.convertSpO2ToPaO2(spo2);
        }

        const ratio = Utils.calculatePFRatio(pao2Value, fio2);

        if (ratio > 0) {
            const roundedRatio = Math.round(ratio);
            elements.pfRatio.textContent = roundedRatio;

            const score = Utils.getPFRatioScore(roundedRatio);
            elements.pfResult.className = 'calculated-value ' + Utils.getScoreClass(score);
        } else {
            elements.pfRatio.textContent = '--';
            elements.pfResult.className = 'calculated-value';
        }
    }

    /**
     * 개별 입력 필드 검증 핸들러
     */
    function handleInputValidation(e) {
        Validator.validateInputElement(e.target);
    }

    /**
     * 폼 제출 처리
     */
    function handleSubmit(e) {
        e.preventDefault();

        const inputs = getInputValues();
        const validation = Validator.validate(inputs);

        if (!validation.isValid) {
            Utils.showToast(validation.errors[0]);
            return;
        }

        currentResult = Calculator.calculate(inputs);
        displayResults(currentResult);

        Storage.saveToHistory(currentResult);
        renderHistory();

        elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * 입력값 수집
     */
    function getInputValues() {
        const oxygenType = getSelectedOxygenType();
        const pao2 = Utils.parseNumber(elements.inputs.pao2.value);
        const spo2 = Utils.parseNumber(elements.inputs.spo2.value);
        const o2flow = Utils.parseNumber(elements.inputs.o2flow.value);
        const fio2 = Utils.calculateFiO2(o2flow);

        const estimatedPao2 = oxygenType === 'spo2' ? Utils.convertSpO2ToPaO2(spo2) : null;
        const pao2ForCalc = oxygenType === 'pao2' ? pao2 : estimatedPao2;
        const pf = Utils.calculatePFRatio(pao2ForCalc, fio2);

        const sbp = Utils.parseNumber(elements.inputs.sbp.value);
        const dbp = Utils.parseNumber(elements.inputs.dbp.value);
        const map = Utils.calculateMAP(sbp, dbp);

        return {
            age: Utils.parseNumber(elements.inputs.age.value),
            wbc: Utils.parseNumber(elements.inputs.wbc.value),
            bilirubin: Utils.parseNumber(elements.inputs.bilirubin.value),
            creatinine: Utils.parseNumber(elements.inputs.creatinine.value),
            isRRT: elements.inputs.rrt.checked,
            heGrade: parseInt(elements.inputs.heGrade.value) || 0,
            inr: Utils.parseNumber(elements.inputs.inr.value),
            sbp: sbp,
            dbp: dbp,
            map: map,
            isVasopressors: elements.inputs.vasopressors.checked,
            oxygenType: oxygenType,
            pao2: oxygenType === 'pao2' ? pao2 : null,
            spo2: oxygenType === 'spo2' ? spo2 : null,
            estimatedPao2: estimatedPao2,
            o2flow: o2flow,
            o2flowText: Utils.getO2FlowText(o2flow),
            fio2: fio2,
            pf: pf
        };
    }

    /**
     * 결과 표시
     */
    function displayResults(result) {
        elements.resultSection.classList.remove('hidden');

        // OF Score
        elements.ofScore.innerHTML = `
            <span class="value">${result.ofScore}</span>
            <span class="unit">/ 18</span>
        `;

        // 장기별 점수
        elements.organBreakdown.innerHTML = Object.entries(result.organScores)
            .map(([organ, score]) => `
                <div class="organ-item">
                    <span class="organ-name">${Calculator.organNames[organ]}</span>
                    <span class="organ-score">
                        <span class="indicator ${Utils.getScoreClass(score)}"></span>
                        <span class="value">${score}점</span>
                    </span>
                </div>
            `).join('');

        // ACLF Score & Grade
        elements.aclfScore.innerHTML = `<span class="value">${result.aclfScore}</span>`;
        elements.aclfGrade.textContent = `${result.aclfGrade.grade} (${result.aclfGrade.count}개 장기부전)`;

        // 예후
        elements.prognosisCard.className = `result-card prognosis-card prognosis-${result.prognosis.level}`;
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
        setTimeout(() => {
            elements.resultSection.classList.add('hidden');
            currentResult = null;

            // 입력 필드 스타일 초기화
            Object.values(elements.inputs).forEach(input => {
                if (input) input.style.borderColor = '';
            });

            // 계산 값 초기화
            elements.calculated.mapValue.textContent = '--';
            elements.calculated.mapResult.className = 'calculated-value';
            elements.calculated.fio2Value.textContent = Config.FIO2.ROOM_AIR;
            elements.calculated.fio2Result.className = 'calculated-value score-1';
            elements.pfRatio.textContent = '--';
            elements.pfResult.className = 'calculated-value';

            // 산소화 토글 초기화
            resetOxygenToggle();

            // O2 유량 기본값
            elements.inputs.o2flow.value = '0';
        }, 0);
    }

    /**
     * 산소화 토글 초기화
     */
    function resetOxygenToggle() {
        // 전역 selectOxygenType 함수 사용
        if (typeof selectOxygenType === 'function') {
            selectOxygenType('pao2');
        }
    }

    /**
     * 결과 복사 처리
     */
    async function handleCopy() {
        if (!currentResult) {
            Utils.showToast('계산 결과가 없습니다.');
            return;
        }

        const success = await Clipboard.copyResult(currentResult);

        if (success) {
            elements.copyBtn.classList.add('copied');
            elements.copyBtn.textContent = '복사 완료!';
            Utils.showToast('클립보드에 복사되었습니다.');

            setTimeout(() => {
                elements.copyBtn.classList.remove('copied');
                elements.copyBtn.textContent = '결과 클립보드에 복사';
            }, 2000);
        } else {
            Utils.showToast('복사에 실패했습니다.');
        }
    }

    /**
     * 이력 삭제 처리
     */
    function handleClearHistory() {
        if (confirm('모든 계산 이력을 삭제하시겠습니까?')) {
            Storage.clearHistory();
            renderHistory();
            Utils.showToast('이력이 삭제되었습니다.');
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
        elements.historyList.innerHTML = history.map((item, index) => `
            <div class="history-item" data-index="${index}">
                <div class="history-info">
                    <span class="history-score">ACLF Score: ${item.aclfScore}</span>
                    <span class="history-date">${Utils.formatDate(item.timestamp, true)}</span>
                </div>
                <span class="history-grade grade-${item.prognosis.level}">${item.aclfGrade.grade}</span>
            </div>
        `).join('');

        // 클릭 이벤트
        elements.historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                loadHistoryItem(history[index]);
            });
        });
    }

    /**
     * 이력 아이템 불러오기
     */
    function loadHistoryItem(item) {
        // 기본 입력값 복원
        elements.inputs.age.value = item.inputs.age;
        elements.inputs.wbc.value = item.inputs.wbc;
        elements.inputs.bilirubin.value = item.inputs.bilirubin;
        elements.inputs.creatinine.value = item.inputs.creatinine;
        elements.inputs.rrt.checked = item.inputs.isRRT;
        elements.inputs.heGrade.value = item.inputs.heGrade;
        elements.inputs.inr.value = item.inputs.inr;
        elements.inputs.vasopressors.checked = item.inputs.isVasopressors;

        // SBP/DBP 복원
        restoreBloodPressure(item.inputs);

        // 산소화 지표 복원
        restoreOxygenation(item.inputs);

        // 결과 표시
        currentResult = item;
        displayResults(item);

        window.scrollTo({ top: 0, behavior: 'smooth' });
        Utils.showToast('이전 계산을 불러왔습니다.');
    }

    /**
     * 혈압 값 복원
     */
    function restoreBloodPressure(inputs) {
        if (inputs.sbp !== undefined) {
            elements.inputs.sbp.value = inputs.sbp;
            elements.inputs.dbp.value = inputs.dbp;
        } else {
            // 이전 버전 호환성
            const map = inputs.map || 70;
            elements.inputs.dbp.value = Math.round(map * 0.9);
            elements.inputs.sbp.value = Math.round(map * 1.2);
        }
        updateMAPDisplay();
    }

    /**
     * 산소화 지표 복원
     */
    function restoreOxygenation(inputs) {
        const oxygenType = inputs.oxygenType || 'pao2';

        // 전역 selectOxygenType 함수 사용하여 토글 상태 설정
        if (typeof selectOxygenType === 'function') {
            selectOxygenType(oxygenType);
        }

        // O2 유량 복원
        restoreO2Flow(inputs);

        // PaO2/SpO2 값 복원
        if (oxygenType === 'spo2' && inputs.spo2 !== undefined) {
            elements.inputs.spo2.value = inputs.spo2;
        } else if (inputs.pao2 !== undefined && inputs.pao2 !== null) {
            elements.inputs.pao2.value = inputs.pao2;
        } else {
            // 이전 버전 호환성
            const fio2 = Utils.calculateFiO2(Utils.parseNumber(elements.inputs.o2flow.value));
            elements.inputs.pao2.value = Math.round((inputs.pf || 300) * (fio2 / 100));
        }

        updatePFRatioDisplay();
    }

    /**
     * O2 유량 복원
     */
    function restoreO2Flow(inputs) {
        if (typeof inputs.o2flow === 'number') {
            elements.inputs.o2flow.value = inputs.o2flow;
        } else if (inputs.o2flow !== undefined) {
            // 이전 버전 호환성 (드롭다운 문자열)
            const fio2 = parseInt(inputs.o2flow) || Config.FIO2.ROOM_AIR;
            elements.inputs.o2flow.value = Math.max(0, Math.round((fio2 - Config.FIO2.ROOM_AIR) / Config.FIO2.PER_LITER));
        } else if (inputs.fio2) {
            // FiO2에서 역산
            elements.inputs.o2flow.value = Math.max(0, Math.round((inputs.fio2 - Config.FIO2.ROOM_AIR) / Config.FIO2.PER_LITER));
        }
        updateFiO2Display();
    }

    /**
     * 서비스 워커 등록
     */
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(reg => console.log('ServiceWorker 등록 성공:', reg.scope))
                    .catch(err => console.log('ServiceWorker 등록 실패:', err));
            });
        }
    }

    // 전역 함수 노출 (인라인 스크립트에서 호출용)
    window.updatePFRatioDisplay = updatePFRatioDisplay;
    window.getSelectedOxygenType = getSelectedOxygenType;

    // DOM 로드 완료 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
