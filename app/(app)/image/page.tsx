import { Suspense } from 'react';
import { ImageGeneratorView } from '@/components/image/ImageGeneratorView';

export default function ImagePage() {
  return (
    // Suspense exigido pelo useSearchParams (?prompt=) na view
    <Suspense>
      <ImageGeneratorView />
    </Suspense>
  );
}
