'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './page.module.css'

// ✅ [타입 정의] Deal 데이터의 '설계도'를 미리 만들어 둡니다.
// 이렇게 하면 데이터가 어떤 모양인지 예측 가능해서 실수를 줄일 수 있습니다.
type Deal = {
  id: number
  airline: string
  deal_name: string
  booking_start: string
  booking_end: string
  department: string
  arrival: string
  discount_rate: string
  description: string
  source_url: string
  isExpired: boolean // 마감 여부를 데이터에 포함시켜 관리를 편하게 합니다.
}

// ✅ [유틸리티 함수] 자주 사용하는 기능은 별도 함수로 만듭니다.
// UTC 시간을 한국 시간(KST) 기준으로 'YYYY-MM-DD' 형식으로 바꿔주는 함수
const formatKSTDate = (utcStr: string) => {
  const date = new Date(utcStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace('.', '');
}

// URL 주소 앞에 'https://'가 없으면 붙여주는 함수
const getFullUrl = (url: string) => {
  if (!url) return '#'
  return url.startsWith('http') ? url : `https://${url}`
}

// GA(구글 애널리틱스)에 사용자 행동을 기록하는 함수
const trackClickEvent = (action: string, label: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', action, {
      event_category: 'interaction',
      event_label: label,
    })
  }
}

// 항공사 이름에 따라 적절한 칩 스타일 클래스를 반환하는 헬퍼 함수
const getAirlineChipClassName = (airline: string) => {
  if (airline.includes('대한항공')) return styles.chipKoreanAir;
  if (airline.includes('제주항공')) return styles.chipJejuAir;
  if (airline.includes('티웨이')) return styles.chipTwayAir;
  return styles.chipDefault;
}

// --- ✈️ [컴포넌트] 딜 카드 ---
// Deal 정보를 받아 카드 형태로 보여주는 '재사용 가능한 UI 블록'입니다.
// 이렇게 분리하면 나중에 카드 디자인만 바꾸고 싶을 때 이 부분만 수정하면 됩니다.
const DealCard = ({ deal }: { deal: Deal }) => (
  <a
    href={getFullUrl(deal.source_url)}
    target="_blank"
    rel="noopener noreferrer"
    className={`${styles.dealCard} ${deal.isExpired ? styles.expired : ''}`}
    onClick={() => trackClickEvent('click_deal_card', deal.deal_name)}
  >
    <div className={styles.dealInfo}>
      <span className={`${styles.airlineChip} ${getAirlineChipClassName(deal.airline)}`}>
        {deal.airline}
      </span>
      <h2>{deal.isExpired ? '[마감] ' : ''}{deal.deal_name}</h2>
      <p>📅 {formatKSTDate(deal.booking_start)} - {formatKSTDate(deal.booking_end)}</p>
    </div>
    <div className={styles.arrowIcon}>→</div>
  </a>
);

// --- 팝업 [컴포넌트] 딜 상세 정보 ---
// 선택된 Deal의 상세 정보를 보여주는 팝업(모달) UI 블록입니다.
const DealModal = ({ deal, onClose }: { deal: Deal, onClose: () => void }) => (
  <div className={styles.modalBackdrop} onClick={onClose}>
    {/* e.stopPropagation()은 팝업창 내부를 클릭했을 때 창이 닫히지 않게 막아주는 역할입니다. */}
    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
      <h2>{deal.isExpired ? '[마감] ' : ''}{deal.airline} - {deal.deal_name}</h2>
      <p><strong>노선:</strong> {deal.department} → {deal.arrival}</p>
      <p><strong>할인정보:</strong> {deal.discount_rate}</p>
      <p><strong>예약기간:</strong> {formatKSTDate(deal.booking_start)} - {formatKSTDate(deal.booking_end)}</p>
      <p><strong>특이사항:</strong> {deal.description}</p>
      <button
        className={styles.button}
        style={{ marginTop: '20px' }} // 이런 간단한 스타일은 인라인으로 처리할 수도 있습니다.
        onClick={() => {
            trackClickEvent('click_go_to_deal', deal.deal_name);
            window.open(getFullUrl(deal.source_url), '_blank');
        }}
      >
        특가 보러가기
      </button>
    </div>
  </div>
)

// --- 🏠 [메인 페이지 컴포넌트] ---
// 이 페이지의 모든 요소를 조립하고,
// 서버에서 데이터를 가져와 사용자에게 보여주는 역할을 하는 가장 핵심적인 부분입니다.
export default function Home() {
  // [상태 관리] useState는 컴포넌트의 '기억 저장소'입니다.
  // 이 저장소의 값이 바뀌면, 화면이 그에 맞춰 자동으로 다시 그려집니다.
  const [deals, setDeals] = useState<Deal[]>([]); // 서버에서 받아온 항공권 딜 목록을 저장할 공간

  // [데이터 로딩] useEffect는 '특정 상황에서만 코드를 실행'하게 해주는 도구입니다.
  // 여기서는 '페이지가 처음 화면에 나타났을 때' 딱 한 번만 실행되도록 설정하여,
  // 서버로부터 항공권 딜 데이터를 가져오는 역할을 합니다.
  useEffect(() => {
    // fetchDeals 함수: 실제 서버와 통신하여 데이터를 가져오는 비동기 함수입니다.
    const fetchDeals = async () => {
      // Supabase(서버)의 'flight_deals' 테이블에서 모든(*) 데이터를 가져옵니다.
      // 데이터는 'data'에, 만약 에러가 발생하면 'error'에 담깁니다.
      const { data, error } = await supabase.from('flight_deals').select('*');

      // 만약 데이터를 가져오는 데 실패하면, 콘솔에 에러 메시지를 기록하고 함수를 종료합니다.
      // 이는 예기치 못한 문제로 앱이 멈추는 것을 방지하는 중요한 방어 코드입니다.
      if (error) {
        console.error('데이터 로딩 중 에러 발생:', error);
        return;
      }

      const now = new Date(); // 현재 시간을 기준으로 딜의 마감 여부를 판단합니다.

      // 서버에서 받은 원본 데이터를 화면에 보여주기 좋은 형태로 가공하고 정렬합니다.
      const processedDeals = (data || []) // data가 비어있을 경우를 대비해 빈 배열로 처리
        .map(deal => ({
          ...deal, // 기존 deal의 모든 정보를 그대로 복사하고,
          isExpired: new Date(deal.booking_end) < now, // 마감 여부를 미리 계산하여 추가합니다.
        }))
        .sort((a, b) => {
          // 토스의 'Simplicity' 원칙: 사용자가 가장 관심 있을 정보를 먼저 보여줍니다.
          // 1. 마감된 딜(a.isExpired)은 항상 마감되지 않은 딜보다 뒤로 보냅니다.
          if (a.isExpired !== b.isExpired) {
            return a.isExpired ? 1 : -1; // 마감됐으면 뒤로(1), 아니면 앞으로(-1)
          }
          // 2. 마감되지 않은 딜 중에서는, 마감일이 가장 가까운 순서대로 정렬합니다.
          return new Date(a.booking_end).getTime() - new Date(b.booking_end).getTime();
        });

      // 가공과 정렬이 끝난 데이터를 '기억 저장소(state)'에 저장합니다.
      // 이 순간, React는 deals 상태가 변경된 것을 감지하고 화면을 다시 그리기 시작합니다.
      setDeals(processedDeals);
    };

    fetchDeals(); // 위에서 정의한 데이터 로딩 함수를 실행합니다.
  }, []); // useEffect의 두 번째 인자인 배열이 비어있으면, 이 코드는 컴포넌트가 처음 렌더링될 때 딱 한 번만 실행됩니다.

  // [화면 렌더링] 사용자에게 보여질 실제 화면의 구조(HTML과 유사)를 그리는 부분입니다.
  // 이 코드는 state가 변경될 때마다 다시 실행되어 항상 최신 정보를 보여줍니다.
  return (
    <div className={styles.pageContainer}>
      {/* 페이지의 제목, 설명, 피드백 요청 등 머리말에 해당하는 부분입니다. */}
      <header className={styles.header}>
        <h1>AirDeal</h1>
        <p>
          여행을 꿈꾸는 모두를 위한 <br />
          항공사별 프로모션을 쉽게 모아보는 피드 서비스
          {/* 부가 정보는 시각적으로 구분하여 정보의 위계를 명확하게 합니다. */}
          <small className={styles.subDescription}>
            ✈️ 대상 항공사: 대한항공, 제주항공, 티웨이항공
          </small>
        </p>

        {/* 사용자의 피드백을 유도하는 섹션을 별도의 카드로 만들어 시각적으로 강조합니다. */}
        <div className={styles.feedbackSection}>
          <p>
            더 편리한 서비스를 만들기 위해 <strong>AirDeal에 대한 피드백</strong>을 받고 있어요. <br />
            아래 버튼을 눌러 의견을 보내주시면 큰 도움이 됩니다 ✍️
          </p>
          <a
            href="https://forms.gle/CJn3ZiHdDCwk7znE7"
            target="_blank" // 링크를 새 탭에서 엽니다.
            rel="noopener noreferrer" // 보안을 위한 필수 속성입니다.
            // 버튼 스타일을 적용하되, 중요도가 낮은 '보조 버튼' 스타일을 사용합니다.
            className={`${styles.button} ${styles.buttonSecondary} ${styles.fitContent}`}
            style={{ marginTop: '16px' }} // CSS 클래스로 관리할 수도 있지만, 간단한 단발성 스타일은 이렇게 직접 적용하기도 합니다.
            onClick={() => trackClickEvent('click_feedback_button', '피드백 보내기')}
          >
            ✉️ 피드백 보내기
          </a>
        </div>
      </header>

      {/* 항공권 딜 목록이 실제로 표시되는 메인 콘텐츠 영역입니다. */}
      <main className={styles.feedContainer}>
        {/* '기억 저장소(deals)'에 있는 각 딜 정보(deal)를 순회하며, */}
        {/* 각 딜에 해당하는 DealCard 컴포넌트를 화면에 하나씩 그립니다. */}
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </main>
    </div>
  );
}