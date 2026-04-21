import React from 'react';
import { useCan } from '../../hooks/useCan';
import { Action, Resource } from '../../utils/permissions';

interface CanProps {
  I: Action;
  a: Resource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const Can: React.FC<CanProps> = ({ I, a, children, fallback = null }) => {
  const can = useCan();
  return <>{can(I, a) ? children : fallback}</>;
};

export default Can;
