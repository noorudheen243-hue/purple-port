
import React, { useState } from 'react';

const CalculatorTool = () => {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');

    const handleNumber = (num: string) => {
        setDisplay(display === '0' ? num : display + num);
        setEquation(equation + num);
    };

    const handleOperator = (op: string) => {
        setDisplay('0');
        setEquation(equation + ' ' + op + ' ');
    };

    const calculate = () => {
        try {
            // eslint-disable-next-line no-eval
            const result = eval(equation);
            setDisplay(String(result));
            setEquation(String(result));
        } catch (e) {
            setDisplay('Error');
            setEquation('');
        }
    };

    const clear = () => {
        setDisplay('0');
        setEquation('');
    };

    return (
        <div className="p-6 h-full flex flex-col items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
                <div className="p-6 bg-gray-800 text-right">
                    <div className="text-gray-400 text-sm h-6 mb-1">{equation}</div>
                    <div className="text-white text-5xl font-light tracking-wider overflow-x-auto custom-scrollbar pb-2">{display}</div>
                </div>

                <div className="grid grid-cols-4 gap-[1px] bg-gray-700 p-[1px]">
                    <button onClick={clear} className="col-span-3 bg-gray-600 hover:bg-gray-500 text-white p-4 text-xl font-medium transition-colors">AC</button>
                    <button onClick={() => handleOperator('/')} className="bg-amber-600 hover:bg-amber-500 text-white p-4 text-xl font-medium transition-colors">÷</button>

                    {[7, 8, 9].map(n => (
                        <button key={n} onClick={() => handleNumber(String(n))} className="bg-gray-800 hover:bg-gray-700 text-white p-4 text-xl transition-colors">{n}</button>
                    ))}
                    <button onClick={() => handleOperator('*')} className="bg-amber-600 hover:bg-amber-500 text-white p-4 text-xl font-medium transition-colors">×</button>

                    {[4, 5, 6].map(n => (
                        <button key={n} onClick={() => handleNumber(String(n))} className="bg-gray-800 hover:bg-gray-700 text-white p-4 text-xl transition-colors">{n}</button>
                    ))}
                    <button onClick={() => handleOperator('-')} className="bg-amber-600 hover:bg-amber-500 text-white p-4 text-xl font-medium transition-colors">-</button>

                    {[1, 2, 3].map(n => (
                        <button key={n} onClick={() => handleNumber(String(n))} className="bg-gray-800 hover:bg-gray-700 text-white p-4 text-xl transition-colors">{n}</button>
                    ))}
                    <button onClick={() => handleOperator('+')} className="bg-amber-600 hover:bg-amber-500 text-white p-4 text-xl font-medium transition-colors">+</button>

                    <button onClick={() => handleNumber('0')} className="col-span-2 bg-gray-800 hover:bg-gray-700 text-white p-4 text-xl transition-colors rounded-bl-xl">0</button>
                    <button onClick={() => handleNumber('.')} className="bg-gray-800 hover:bg-gray-700 text-white p-4 text-xl transition-colors">.</button>
                    <button onClick={calculate} className="bg-amber-600 hover:bg-amber-500 text-white p-4 text-xl font-medium transition-colors rounded-br-xl">=</button>
                </div>
            </div>
        </div>
    );
};

export default CalculatorTool;
