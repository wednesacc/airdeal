'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './page.module.css'

// ✅ [타입 정의] Deal 데이터의 '설계도'를 미리 만들어 둡니다.
// (isExpired 속성 제거)
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
// ('마감' 관련 로직 제거)
const DealCard = ({ deal }: { deal: Deal }) => (
  <a
    href={getFullUrl(deal.source_url)}
    target="_blank"
    rel="noopener noreferrer"
    className={styles.dealCard}
    onClick={() => trackClickEvent('click_deal_card', deal.deal_name)}
  >
    <div className={styles.dealInfo}>
      <span className={`${styles.airlineChip} ${getAirlineChipClassName(deal.airline)}`}>
        {deal.airline}
      </span>
      <h2>{deal.deal_name}</h2>
      <p>📅 {formatKSTDate(deal.booking_start)} - {formatKSTDate(deal.booking_end)}</p>
    </div>
    <div className={styles.arrowIcon}>→</div>
  </a>
);

// --- 팝업 [컴포넌트] 딜 상세 정보 ---
// 선택된 Deal의 상세 정보를 보여주는 팝업(모달) UI 블록입니다.
// ('마감' 관련 로직 제거)
const DealModal = ({ deal, onClose }: { deal: Deal, onClose: () => void }) => (
  <div className={styles.modalBackdrop} onClick={onClose}>
    {/* e.stopPropagation()은 팝업창 내부를 클릭했을 때 창이 닫히지 않게 막아주는 역할입니다. */}
    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
      <h2>{deal.airline} - {deal.deal_name}</h2>
      <p><strong>노선:</strong> {deal.department} → {deal.arrival}</p>
      <p><strong>할인정보:</strong> {deal.discount_rate}</p>
      <p><strong>예약기간:</strong> {formatKSTDate(deal.booking_start)} - {formatKSTDate(deal.booking_end)}</p>
      <p><strong>특이사항:</strong> {deal.description}</p>
      <button
        className={styles.button}
        style={{ marginTop: '20px' }}
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
export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  // ✨ [신규] 선택된 항공사 필터를 관리하는 상태
  const [selectedAirline, setSelectedAirline] = useState('전체');

  useEffect(() => {
    const fetchDeals = async () => {
      const { data, error } = await supabase.from('flight_deals').select('*');

      if (error) {
        console.error('데이터 로딩 중 에러 발생:', error);
        return;
      }

      const now = new Date(); // 현재 시간

      const processedDeals = (data || [])
        // ✨ [수정] 마감되지 않은 딜만 필터링합니다.
        .filter(deal => new Date(deal.booking_end) >= now)
        // ✨ [수정] 마감일이 가까운 순서대로 정렬합니다. (마감된 딜 정렬 로직 제거)
        .sort((a, b) => new Date(a.booking_end).getTime() - new Date(b.booking_end).getTime());

      setDeals(processedDeals);
    };

    fetchDeals();
  }, []);

  // ✨ [신규] 필터링에 사용할 항공사 목록
  const AIRLINE_FILTERS = ['전체', '대한항공', '제주항공'];

  // ✨ [신규] 선택된 항공사에 따라 딜 목록을 필터링합니다.
  const filteredDeals = deals.filter(deal => {
    if (selectedAirline === '전체') return true; // '전체' 선택 시 모든 딜 표시
    return deal.airline.includes(selectedAirline); // 특정 항공사 선택 시 해당 항공사 딜만 표시
  });

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>AirDeal</h1>
        <p>
          여행을 꿈꾸는 모두를 위한 <br />
          항공사별 프로모션을 쉽게 모아보는 피드 서비스
          <small className={styles.subDescription}>
            ✈️ 대상 항공사: 대한항공, 제주항공
          </small>
        </p>

        {/* ✨ 항공사 필터링 UI */}
        <div className={styles.filterContainer}>
          {AIRLINE_FILTERS.map(airline => (
            <button
              key={airline}
              // 선택된 항공사에 'activeFilter' 스타일을 적용합니다.
              className={`${styles.filterChip} ${selectedAirline === airline ? styles.activeFilter : ''}`}
              onClick={() => {
                setSelectedAirline(airline)
                trackClickEvent('click_filter_chip', airline);
              }}
            >
              {airline}
            </button>
          ))}
        </div>
      </header>

      <main className={styles.feedContainer}>
        {/* ✨ 필터링된 딜 목록(filteredDeals)을 화면에 그립니다. */}
        {filteredDeals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </main>
    </div>
  );
}