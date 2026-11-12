import { useEvents, useTickets } from '../lib/hooks'
import { usePageTitle } from '../lib/title'
import EventFeed from '../components/EventFeed'
import { Empty, Skeleton, PageHead } from '../components/ui'

export default function Events() {
  usePageTitle('공연 목록')
  const { data: events = [], isLoading } = useEvents()
  const { data: tickets = [] } = useTickets()

  return (
    <>
      <PageHead title="공연">진행 상태별로 공연을 찾아보세요.</PageHead>
      {isLoading && <Skeleton kind="cards" rows={4} />}
      {!isLoading && events.length === 0 && <Empty>등록된 공연이 없습니다.</Empty>}
      {events.length > 0 && <EventFeed events={events} tickets={tickets} />}
    </>
  )
}
