'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './page.module.css'

const formatKSTDate = (utcStr: string) => {
  const utc = new Date(utcStr)
  const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10) // yyyy-mm-dd
}

export default function Home() {
  const [deals, setDeals] = useState<any[]>([])
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null)

  useEffect(() => {
    const fetchDeals = async () => {
      const { data, error } = await supabase.from('flight_deals').select('*')
      if (error) {
        console.error('Supabase fetch error:', error)
        return
      }

        const now = new Date().getTime()

        const sorted = (data || []).sort((a, b) => {
          const aEnd = new Date(a.booking_end).getTime()
          const bEnd = new Date(b.booking_end).getTime()
          const aExpired = aEnd < now
          const bExpired = bEnd < now

          if (aExpired !== bExpired) return aExpired ? 1 : -1 // ✅ 마감된 항목은 뒤로
          return aEnd - bEnd // ✅ 가까운 예약 마감일 순서대로 정렬
        })
      setDeals(sorted)
    }

    fetchDeals()
  }, [])

  const openModal = (deal: any) => setSelectedDeal(deal)
  const closeModal = () => setSelectedDeal(null)

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <h1>AirDeal</h1>
        <p>
          돈은 적어도 떠나고 싶은 이들을 위한 <br />
          항공 특가 피드 서비스
        </p>
        <h3>
          더 편리한 서비스를 만들기 위해 <strong>AirDeal에 대한 피드백</strong>을 받고 있어요. <br />
          아래 버튼을 눌러 의견을 보내주시면 큰 도움이 됩니다 ✍️
        </h3>
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSdEXAMPLEFORM"
          target="_blank"
          rel="noopener noreferrer"
          className={styles['form-button']}
        >
          ✉️ 피드백 보내기
        </a>
      </div>

      <div className={styles.feed}>
      {deals.map((deal) => {
        const isExpired = new Date(deal.booking_end).getTime() < Date.now() // ✅ 최신 시점 비교
          const title = `${isExpired ? '[마감] ' : ''}${deal.airline} - ${deal.deal_name}`

          return (
            <div
              key={deal.id}
              className={`${styles['deal-card']} ${isExpired ? styles['expired'] : ''}`}
              onClick={() => openModal(deal)}
            >
              <h2>{title}</h2>
              <p>{deal.department} → {deal.arrival}</p>
              <p>{deal.discount_rate}</p>
              <p>{formatKSTDate(deal.booking_start)} - {formatKSTDate(deal.booking_end)}</p>
            </div>
          )
        })}
      </div>

      {selectedDeal && (
        <div className={styles['modal-backdrop']} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h2>{
            new Date(selectedDeal.booking_end).getTime() < Date.now()
              ? `[마감] ${selectedDeal.airline} - ${selectedDeal.deal_name}`
              : `${selectedDeal.airline} - ${selectedDeal.deal_name}`
          }</h2>
            <p><strong>노선:</strong> {selectedDeal.department} → {selectedDeal.arrival}</p>
            <p><strong>할인정보:</strong> {selectedDeal.discount_rate}</p>
            <p><strong>예약기간:</strong> {formatKSTDate(selectedDeal.booking_start)} - {formatKSTDate(selectedDeal.booking_end)}</p>
            <p><strong>특이사항:</strong> {selectedDeal.description}</p>
            <button
              className={styles['go-button']}
              onClick={() => window.open(selectedDeal.source_url, '_blank')}
            >
              특가 보러가기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
