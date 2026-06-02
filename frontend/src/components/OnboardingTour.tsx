'use client'

import { useEffect, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

interface OnboardingTourProps {
  startTour?: boolean
  onTourEnd?: () => void
}

export function OnboardingTour({ startTour, onTourEnd }: OnboardingTourProps) {
  const initTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      doneBtnText: 'Понятно',
      nextBtnText: 'Далее',
      prevBtnText: 'Назад',
      onPopoverRender: (popover, { config, state }) => {
        // Apply custom styling
        popover.wrapper.classList.add('dark:bg-neutral-900', 'dark:text-white', 'dark:border-neutral-800')
      },
      onDestroyed: () => {
        if (onTourEnd) {
          onTourEnd()
        }
      },
      steps: [
        {
          element: '#tour-balance',
          popover: {
            title: 'Ваш баланс',
            description: 'Здесь отображается ваш текущий баланс кредитов. Кредиты используются для получения лидов.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-auctions',
          popover: {
            title: 'Аукционы',
            description: 'В этом разделе вы можете делать ставки на самых горячих лидов, которых выкладывают другие мастера.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-leads',
          popover: {
            title: 'Доступные лиды',
            description: 'Здесь появляются свежие лиды. Будьте быстрыми — кто первый заберёт лид, тот и будет работать с клиентом!',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '#tour-profile',
          popover: {
            title: 'Профиль и настройки',
            description: 'Заполните свой профиль и настройте уведомления, чтобы не пропустить ни одной новой заявки.',
            side: 'left',
            align: 'start'
          }
        }
      ]
    })

    driverObj.drive()
  }, [onTourEnd])

  useEffect(() => {
    if (startTour) {
      initTour()
    }
  }, [startTour, initTour])

  return null
}
