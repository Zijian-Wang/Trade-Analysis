import { describe, it, expect } from 'vitest';
import { useTradeCalculator, TradeCalculationResult } from '../app/hooks/useTradeCalculator';
import { renderHook, act } from '@testing-library/react';

describe('useTradeCalculator', () => {
  const portfolioCapital = 100000;

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital));

    expect(result.current.tickerSymbol).toBe('');
    expect(result.current.direction).toBe('long');
    expect(result.current.riskPerTrade).toBe(0.75);
    expect(result.current.entryPrice).toBe(0);
    expect(result.current.stopLoss).toBe(0);
    expect(result.current.target).toBe('');
    expect(result.current.position.canCalculate).toBe(false);
  });

  it('should not calculate position without required inputs', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital));

    expect(result.current.position.canCalculate).toBe(false);
    expect(result.current.position.shares).toBe(0);
  });

  it('should calculate position correctly for long trade', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital));

    act(() => {
      result.current.setTickerSymbol('AAPL');
      result.current.setEntryPrice(150);
      result.current.setStopLoss(145);
    });

    expect(result.current.position.canCalculate).toBe(true);
    // Risk amount = 100000 * 0.75% = 750
    // Price risk = 150 - 145 = 5
    // Shares = 750 / 5 = 150
    expect(result.current.position.shares).toBe(150);
    expect(result.current.position.riskAmount).toBe(750);
  });

  it('should calculate position correctly for short trade', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital));

    act(() => {
      result.current.setTickerSymbol('TSLA');
      result.current.setDirection('short');
      result.current.setEntryPrice(200);
      result.current.setStopLoss(210);
    });

    expect(result.current.position.canCalculate).toBe(true);
    // Risk amount = 100000 * 0.75% = 750
    // Price risk = |200 - 210| = 10
    // Shares = 750 / 10 = 75
    expect(result.current.position.shares).toBe(75);
  });

  it('should reject invalid stop loss for long trade', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital));

    act(() => {
      result.current.setTickerSymbol('AAPL');
      result.current.setEntryPrice(150);
      result.current.setStopLoss(160); // Stop above entry for long = invalid
    });

    expect(result.current.position.canCalculate).toBe(false);
  });

  it('should reject invalid stop loss for short trade', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital));

    act(() => {
      result.current.setTickerSymbol('TSLA');
      result.current.setDirection('short');
      result.current.setEntryPrice(200);
      result.current.setStopLoss(190); // Stop below entry for short = invalid
    });

    expect(result.current.position.canCalculate).toBe(false);
  });

  it('should calculate R:R ratio when target is provided', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital));

    act(() => {
      result.current.setTickerSymbol('AAPL');
      result.current.setEntryPrice(150);
      result.current.setStopLoss(145);
      result.current.setTarget('160');
    });

    expect(result.current.position.canCalculate).toBe(true);
    // Reward = 160 - 150 = 10
    // Risk = 150 - 145 = 5
    // R:R = 10 / 5 = 2
    expect(result.current.position.rrRatio).toBe(2);
  });

  it('should update risk per trade', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital));

    act(() => {
      result.current.setTickerSymbol('AAPL');
      result.current.setEntryPrice(150);
      result.current.setStopLoss(145);
      result.current.setRiskPerTrade(1.0);
    });

    expect(result.current.position.canCalculate).toBe(true);
    // Risk amount = 100000 * 1.0% = 1000
    // Price risk = 5
    // Shares = 1000 / 5 = 200
    expect(result.current.position.shares).toBe(200);
    expect(result.current.position.riskAmount).toBe(1000);
  });
});
