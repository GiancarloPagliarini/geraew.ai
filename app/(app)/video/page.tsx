import { Suspense } from 'react';
import { VideoGeneratorView } from '@/components/video/VideoGeneratorView';

export default function VideoPage() {
  return (
    // Suspense exigido pelo useSearchParams (?prompt=) na view
    <Suspense>
      <VideoGeneratorView />
    </Suspense>
  );
}
