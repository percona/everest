import { Skeleton } from '@mui/material';

const LoadingPageSkeleton = () => (
  <>
    <Skeleton variant="rectangular" />
    <Skeleton variant="rectangular" />
    <Skeleton />
    <Skeleton />
    <Skeleton />
    <Skeleton variant="rectangular" />
  </>
);

export default LoadingPageSkeleton;
