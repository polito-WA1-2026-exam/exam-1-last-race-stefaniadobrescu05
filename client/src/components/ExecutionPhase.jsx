import { useState } from 'react'
import CoinAmount from './CoinAmount'

function ExecutionPhase({ executionResult, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0)
  const steps = Array.isArray(executionResult?.executionSteps)
    ? executionResult.executionSteps
    : []
  const currentStep = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  if (!currentStep) {
    return (
      <section className="content-card placeholder-card">
        <h1>Execution complete</h1>
        <button className="primary-button" type="button" onClick={onComplete}>View result</button>
      </section>
    )
  }

  return (
    <section className="content-card game-setup-card execution-card">
      <p className="eyebrow">Execution phase</p>
      <h1>Traveling your route.</h1>
      <p className="execution-progress">Step {stepIndex + 1} of {steps.length}</p>
      <article className="execution-step-card">
        <h2>{currentStep.from} &rarr; {currentStep.to}</h2>
        <p><strong>Line:</strong> {currentStep.line}</p>
        <p><strong>Event:</strong> {currentStep.eventDescription}</p>
        <p className={currentStep.effect >= 0 ? 'positive-effect' : 'negative-effect'}>
          Effect: {currentStep.effect >= 0 ? '+' : ''}{currentStep.effect}
        </p>
        <CoinAmount className="coins-after-step">Coins after this step: {currentStep.coinsAfterStep}</CoinAmount>
      </article>
      <button className="primary-button" type="button" onClick={() => {
        if (isLastStep) onComplete()
        else setStepIndex((currentIndex) => currentIndex + 1)
      }}>{isLastStep ? 'View result' : 'Next step'}</button>
    </section>
  )
}

export default ExecutionPhase
