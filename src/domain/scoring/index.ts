export interface ScoreLimit{maxExact:number;overflow:number}
export function scoreLimit(par:number,strokesReceived:number):ScoreLimit{const effective=Math.max(0,strokesReceived);const maxExact=par+effective+1;return{maxExact,overflow:maxExact+1};}
export function netScore(gross:number,strokesReceived:number):number{return gross-strokesReceived;}
export function betterballScore(nets:number[]):number{if(!nets.length)throw new Error("At least one score is required");return Math.min(...nets);}
export type HoleWinner="A"|"B"|"HALVED";
export function compareScores(a:number,b:number):HoleWinner{return a<b?"A":b<a?"B":"HALVED";}
