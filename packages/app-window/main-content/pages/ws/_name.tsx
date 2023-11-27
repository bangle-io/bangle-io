import React from 'react';
import { useParams } from 'wouter';

export default function PageWsName() {
  const params = useParams();
  return (
    <div>
      <h1>{params.wsName}</h1>
      <p>Workspace content</p>
    </div>
  );
}
