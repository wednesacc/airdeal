'use client'
import React, { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import { supabase } from '../lib/supabase'
import styles from './page.module.css'
import koLocale from '@fullcalendar/core/locales/ko'

const convertToKST = (utcDateStr: string) => {
  if (!utcDateStr) return null
  const utc = new Date(utcDateStr)
  const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]
}

export default function Home() {
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const { data, error } = await supabase.from('flight_deals').select('*')
        if (error) {
          console.error('Supabase fetch error:', error)
          return
        }

        if (!data) return

        const mapped = data.map((deal: any) => ({
          title: `✈️ ${deal.airline}\n🔹 ${deal.deal_name}`,
          start: convertToKST(deal.booking_start),
          url: deal.source_url,
          extendedProps: {
            description: `✈️${deal.airline} - ${deal.deal_name}✈️
📍특가노선: ${deal.department}–${deal.arrival}
📍할인정보: ${deal.discount_rate ?? ''}
📍특이사항: ${deal.description ?? ''}`,
          },
        }))

        setEvents(mapped)
      } catch (err) {
        console.error('fetchDeals failed:', err)
      }
    }

    fetchDeals()
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <h1>AirDeal</h1>
        <h3>
          돈은 적어도 떠나고 싶은 이들을 위한<br />
          항공 특가 프로모션 캘린더 서비스
        </h3>
      </div>

      <div className={styles['calendar-wrapper']}>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          height="auto"
          locale={koLocale}
          events={events}
          eventClick={(info) => {
            info.jsEvent.preventDefault()
            if (info.event.url) window.open(info.event.url, '_blank')
          }}
          eventDidMount={(info) => {
            const description = info.event.extendedProps.description
            if (!description) return

            const tooltip = document.createElement('div')
            tooltip.innerHTML = description.replace(/\n/g, '<br>')
            Object.assign(tooltip.style, {
              position: 'absolute',
              background: '#333',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              zIndex: '9999',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'opacity 0.2s ease',
              opacity: '0',
              pointerEvents: 'auto',
            })

            let hideTimeout: ReturnType<typeof setTimeout> | null = null
            let tooltipVisible = false

            const showTooltip = () => {
              if (tooltipVisible) return
              document.body.appendChild(tooltip)
              const rect = info.el.getBoundingClientRect()
              tooltip.style.top = `${rect.top + window.scrollY + 20}px`
              tooltip.style.left = `${rect.left + window.scrollX}px`
              requestAnimationFrame(() => {
                tooltip.style.opacity = '1'
              })
              tooltipVisible = true
            }

            const hideTooltip = () => {
              if (!tooltipVisible) return
              tooltip.style.opacity = '0'
              hideTimeout = setTimeout(() => {
                if (tooltip.parentNode) {
                  tooltip.parentNode.removeChild(tooltip)
                }
                tooltipVisible = false
              }, 200)
            }

            tooltip.addEventListener('mouseenter', () => {
              if (hideTimeout) clearTimeout(hideTimeout)
            })

            tooltip.addEventListener('mouseleave', hideTooltip)

            info.el.addEventListener('mouseenter', () => {
              if (hideTimeout) clearTimeout(hideTimeout)
              showTooltip()
            })

            info.el.addEventListener('mouseleave', () => {
              hideTimeout = setTimeout(hideTooltip, 200)
            })

            info.el.addEventListener('click', (e) => {
              e.preventDefault()
              tooltipVisible ? hideTooltip() : showTooltip()
            })
          }}
        />
      </div>
    </div>
  )
}
