/* A · Q&A backup — press 1–9 or 0 (or click) to open an answer card; Esc closes. */
Deck.register('qa', (function () {
  const QA = {
    1: { q: '왜 GAN이 아니라 diffusion인가요?',
      a: `이전에도 DOOM을 신경망으로 흉내 낸 연구가 있었어요. <b>World Models</b>와 <b>GameGAN</b>인데, 화질이 훨씬 낮아요 (Figure 2).
          수업에서 본 것처럼 GAN은 적대적 학습이라 불안정하고 다양성이 떨어질 수 있어요. diffusion은 화질이 높고 학습이 안정적이라, 몇 분씩 계속 생성해야 하는 상황에 유리해요.`,
      fig: 'assets/fig/fig2.png', cap: '논문 Figure 2 — 이전 DOOM 시뮬레이션 vs GameNGen' },
    2: { q: '디노이징 4단계면 충분한 이유는?',
      a: `다음 프레임은 과거 프레임만 봐도 거의 정해져요. 대부분이 직전 프레임과 거의 같아서, 모델이 처음부터 "상상"해야 할 부분이 적어요.
          Table 1을 보면 4단계와 64단계의 품질 차이가 거의 없어요.<small>4단계: PSNR 32.58 · 64단계: 32.19 · 1단계: 25.47 (1단계로 증류한 모델은 31.10 → 50 FPS)</small>`,
      fig: 'assets/fig/table1.png', cap: '논문 Table 1' },
    3: { q: '왜 랜덤 플레이 대신 RL 에이전트를 썼나요?',
      a: `랜덤하게 키를 누르면 레벨 안쪽까지 가지 못해서, 데이터가 다양한 상황을 담지 못해요.
          에이전트 데이터가 더 좋고, 특히 중간 난이도 장면에서 차이가 커요.<small>중간 난이도: 에이전트 20.21 vs 랜덤 16.50 PSNR (3초 생성 후 프레임 기준)</small>`,
      fig: 'assets/fig/table3.png', cap: '논문 Table 3 (Figure 16도 참고)' },
    4: { q: '과거 64프레임이나 필요한가요?',
      a: `길수록 좋아지긴 하지만, 4프레임 이후로는 이득이 작아요 (Table 2).
          그래서 프레임을 더 넣는 것만으로는 긴 기억을 얻기 어렵고, 다른 구조가 필요할 거예요.<small>1프레임: 20.94 · 4프레임: 22.26 · 64프레임: 22.36 PSNR</small>`,
      fig: 'assets/fig/table2.png', cap: '논문 Table 2' },
    5: { q: '노이즈 증강은 구체적으로 어떻게 하나요?',
      a: `학습할 때 노이즈 양 <b>α</b>를 0~<b>0.7</b>에서 균등하게 뽑아서, <i>인코딩한</i> 과거 프레임에 가우시안 노이즈를 섞어요.
          α는 <b>10개 구간</b>으로 나누고 구간마다 임베딩을 학습해서 넣어요. 그래서 모델이 과거 프레임을 얼마나 믿을지 알 수 있어요.
          <small>추론 때는 섞는 노이즈 양을 조절할 수 있는데, 아예 안 섞어도 결과가 크게 좋아져요. 학습 때 망가진 과거를 본 것 자체가 효과예요 (§3.2.1, §5.2.2)</small>`,
      fig: 'assets/fig/fig7.png', cap: '논문 Figure 7 — 노이즈 증강 유무에 따른 LPIPS / PSNR' },
    6: { q: '다른 게임에도 되나요?',
      a: `네. 논문에서 <b>Chrome Dino</b> 게임도 시뮬레이션해요 (Figure 18).
          사람이 프레임을 직접 고쳐도(적 추가, 벽 변경 등) 그럴듯하게 이어서 생성해요 (Figure 14–15).`,
      fig: 'assets/fig/fig18.png', cap: '논문 Figure 18 — Chrome Dino' },
    7: { q: '실제 게임 엔진을 대신할 수 있나요?',
      a: `아직은 아니에요. 학습에 <b>TPU-v5e 128개</b>를 썼고, 기억은 약 3초뿐이고, 있는 게임을 따라 할 수만 있어요.
          그래도 데이터만으로 상호작용하는 시뮬레이터를 만들 수 있다는 걸 보여 줬다는 점에서, 현실을 시뮬레이션해야 하는 <b>로봇</b>·<b>자율주행</b> 분야에 의미가 커요.`,
      fig: 'assets/fig/fig1.jpg', cap: '논문 Figure 1' },
    8: { q: 'RL 에이전트의 보상은 어떻게 줬나요?',
      a: `PPO로 학습했고, DOOM에 맞춘 간단한 보상을 썼어요 (부록 A.5):
          <ul><li>적 명중 +300 · 처치 +1,000</li><li>피격 −100 · 사망 −5,000</li><li>아이템/무기 +100 · 비밀 장소 +500</li><li>새 구역 +20·(1 + 0.5·L1 거리)</li><li>체력/방어구/탄약 변화 ×10</li></ul>
          <small>사람처럼 부드럽게 플레이하도록 각 행동을 4프레임씩 반복해요.</small>`,
      fig: 'assets/fig/fig16.png', cap: '논문 Figure 16 — 에이전트(주황) vs 랜덤 플레이(파랑)' },
    9: { q: '논문의 손실 식이 수업 때 본 식이랑 다른데요?',
      a: `수업: L = E‖ε − ε<sub>θ</sub>(x<sub>t</sub>, t)‖²<br>논문 (1): L = E‖v − v<sub>θ</sub>(x<sub>t</sub>, t, ϕ(o<sub>&lt;n</sub>), A<sub>emb</sub>(a<sub>&lt;n</sub>))‖²<br>
          x<sub>t</sub>를 만드는 식은 수업 때랑 똑같아요. 다른 점은 두 가지예요.
          <ul><li>노이즈 ε 대신 <b>v = √ᾱ<sub>t</sub>·ε − √(1−ᾱ<sub>t</sub>)·x<sub>0</sub></b>를 맞혀요 (v-prediction). ε와 x<sub>0</sub>를 섞은 값이라, v를 맞히면 노이즈도 바로 계산돼요. 노이즈를 걷어내는 흐름은 같아요.</li>
          <li>조건으로 <b>과거 프레임 ϕ(o<sub>&lt;n</sub>)</b>와 <b>키 입력 A<sub>emb</sub>(a<sub>&lt;n</sub>)</b>가 추가돼요. 오늘 설명한 두 가지 변경이 식에 그대로 보여요.</li></ul>`,
      fig: 'assets/fig/fig3.png', cap: '논문 Figure 3 — 구조 개요' },
    0: { q: 'Sora 같은 영상 생성 모델과 뭐가 다른가요?',
      a: `영상 생성 모델은 보통 프롬프트를 받아 정해진 길이의 영상을 한 번에 만들어요.
          GameNGen은 <b>매 프레임 키 입력을 받아서</b>, 자기가 만든 프레임을 이어 가며 <b>실시간으로</b> 다음 프레임을 만들어요. 사용자가 중간에 개입하는 <b>상호작용</b>이 핵심이에요.
          그래서 drift와 속도(20 FPS)가 이 논문의 핵심 문제가 돼요.`,
      fig: 'assets/fig/fig1.jpg', cap: '논문 Figure 1' }
  };
  let elQ;
  function open(n) {
    const d = QA[n]; if (!d) return;
    elQ.querySelector('.qd-q').innerHTML = `<b>${n}</b>${d.q}`;
    elQ.querySelector('.qd-a').innerHTML = d.a;
    elQ.querySelector('.qd-fig').innerHTML = `<img src="${d.fig}" alt=""><span>${d.cap}</span>`;
    elQ.classList.add('qa-open');
  }
  const close = () => elQ.classList.remove('qa-open');
  return {
    init(el) {
      elQ = el;
      FX.$$(el, '.qa-c').forEach(b => b.addEventListener('click', () => open(+b.dataset.q)));
      el.querySelector('.qa-detail').addEventListener('click', close);
    },
    key(e) {
      if (/^[0-9]$/.test(e.key)) { open(+e.key); return true; }
      if (e.key === 'Escape' && elQ.classList.contains('qa-open')) { close(); return true; }
      if ((e.key === 'ArrowLeft' || e.key === 'PageUp') && elQ.classList.contains('qa-open')) { close(); return true; }
      return false;
    },
    leave() { close(); }
  };
})());
