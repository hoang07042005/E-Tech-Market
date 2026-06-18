import { renderWithProviders as render } from '../../__tests__/utils/test-utils';
;
import Skeleton from '../../components/Skeleton';
import { describe, it, expect } from 'vitest';

describe('Skeleton Component', () => {
  it('should render correctly with default props', () => {
    const { container } = render(<Skeleton />);
    const skeletonElement = container.firstChild as HTMLElement;

    expect(skeletonElement).toBeInTheDocument();
    expect(skeletonElement).toHaveClass('skeleton');
    expect(skeletonElement).toHaveStyle({
      width: '100%',
      height: '1rem',
    });
  });

  it('should apply custom width and height', () => {
    const { container } = render(<Skeleton width="50px" height="50px" />);
    const skeletonElement = container.firstChild as HTMLElement;

    expect(skeletonElement).toHaveStyle({
      width: '50px',
      height: '50px',
    });
  });

  it('should apply custom numeric width and height', () => {
    const { container } = render(<Skeleton width={100} height={200} />);
    const skeletonElement = container.firstChild as HTMLElement;

    expect(skeletonElement).toHaveStyle({
      width: '100px',
      height: '200px',
    });
  });

  it('should apply borderRadius if provided', () => {
    const { container } = render(<Skeleton borderRadius="50%" />);
    const skeletonElement = container.firstChild as HTMLElement;

    expect(skeletonElement).toHaveStyle({
      borderRadius: '50%',
    });
  });

  it('should apply custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />);
    const skeletonElement = container.firstChild as HTMLElement;

    expect(skeletonElement).toHaveClass('skeleton');
    expect(skeletonElement).toHaveClass('custom-class');
  });

  it('should merge inline styles', () => {
    const { container } = render(<Skeleton style={{ margin: '10px', display: 'inline-block' }} />);
    const skeletonElement = container.firstChild as HTMLElement;

    expect(skeletonElement).toHaveStyle({
      margin: '10px',
      display: 'inline-block',
    });
  });
});
