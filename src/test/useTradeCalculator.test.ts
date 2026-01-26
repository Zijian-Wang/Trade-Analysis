import { describe, it, expect } from 'vitest';
import { useTradeCalculator, TradeCalculationResult } from '../app/hooks/useTradeCalculator';
import { renderHook, act } from '@testing-library/react';

describe('useTradeCalculator', () => {
  const portfolioCapital = 100000;

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital, 'US'));

    expect(result.current.tickerSymbol).toBe('');
    expect(result.current.direction).toBe('long');
    expect(result.current.riskPerTrade).toBe(0.75);
    expect(result.current.entryPrice).toBe(0);
    expect(result.current.stopLoss).toBe(0);
    expect(result.current.target).toBe('');
    expect(result.current.position.canCalculate).toBe(false);
  });

  it('should not calculate position without required inputs', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital, 'US'));

    expect(result.current.position.canCalculate).toBe(false);
    expect(result.current.position.shares).toBe(0);
  });

  it('should calculate position correctly for long trade', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital, 'US'));

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
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital, 'US'));

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
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital, 'US'));

    act(() => {
      result.current.setTickerSymbol('AAPL');
      result.current.setEntryPrice(150);
      result.current.setStopLoss(160); // Stop above entry for long = invalid
    });

    expect(result.current.position.canCalculate).toBe(false);
  });

  it('should reject invalid stop loss for short trade', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital, 'US'));

    act(() => {
      result.current.setTickerSymbol('TSLA');
      result.current.setDirection('short');
      result.current.setEntryPrice(200);
      result.current.setStopLoss(190); // Stop below entry for short = invalid
    });

    expect(result.current.position.canCalculate).toBe(false);
  });

  it('should calculate R:R ratio when target is provided', () => {
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital, 'US'));

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
    const { result } = renderHook(() => useTradeCalculator(portfolioCapital, 'US'));

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


  describe('CN Market Specifics', () => {
    it('should round shares down to nearest 100 for CN market', () => {
      const { result } = renderHook(() => useTradeCalculator(portfolioCapital, 'CN'));

      act(() => {
        result.current.setTickerSymbol('600519');
        result.current.setEntryPrice(10);
        result.current.setStopLoss(9);
        // Risk = 750 (0.75% of 100k)
        // Price Risk = 1
        // Raw Shares = 750
        // Rounded Shares should be 700 (if we change risk to make it not exact)
        result.current.setRiskPerTrade(0.753); // Risk ~753 -> Shares 753 -> Round to 700
      });

      expect(result.current.position.canCalculate).toBe(true);
      // Risk = 753
      // Shares = 753 / 1 = 753 -> Rounded down to 700
      expect(result.current.position.shares).toBe(700);
      
      // Actual Risk Amount should be updated based on rounded shares
      // 700 * 1 = 700
      expect(result.current.position.riskAmount).toBe(700);
    });

    it('should return 0 shares if calculation is less than 100 for CN market', () => {
      const { result } = renderHook(() => useTradeCalculator(portfolioCapital, 'CN'));

      act(() => {
        result.current.setTickerSymbol('600519');
        result.current.setEntryPrice(100);
        result.current.setStopLoss(90);
        // Risk = 750
        // Price Risk = 10
        // Raw Shares = 75
        // Rounded Shares should be 0
      });

      expect(result.current.position.shares).toBe(0);
      expect(result.current.position.riskAmount).toBe(0);
    });
  });
});
