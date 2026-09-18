// Read-only presentation adapter. No phase can be advanced by a view or a clock.
export function referencePhase(snapshot) {
 const trajectory=snapshot.trajectory.active||snapshot.trajectory.terminal,completion=trajectory?.completion;
 if(snapshot.driver.state==='terminal'){
  if(completion?.completedStepCount>0&&completion.remainingStepCount>0)return 'partial';
  const outcome=snapshot.driver.terminal?.outcome;
  if(['completed','rejected','cancelled'].includes(outcome))return outcome;
  return 'failed';
 }
 if(snapshot.driver.state==='awaiting-review')return 'review';
 if(snapshot.driver.state==='awaiting-outcome')return 'executing';
 throw new Error('Unmapped Runtime fixture state: '+snapshot.driver.state);
}
