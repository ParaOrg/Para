import { WaitingList } from './waiting-list';
import { usePublicationQuery } from '../data/use-review-query';

/** The waiting list, read through the studio's publication query. */
export function PublicWaiting() {
  const query = usePublicationQuery();
  if (query.isPending) return <WaitingList state={{ status: 'loading' }} />;
  if (query.isError)
    return (
      <WaitingList
        state={{
          status: 'error',
          message: 'The waiting list could not be read. Check your connection and try again.',
          onRetry: () => void query.refetch(),
        }}
      />
    );
  return (
    <WaitingList
      state={{
        status: 'ready',
        publishedAt: query.data.publishedAt,
        subjects: query.data.waiting,
      }}
    />
  );
}
