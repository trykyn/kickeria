      
var initMu = 25;
var initSigma = initMu / 3;
var defaultDynamicsFactor = initMu / 100; // / 300

var defBeta = (initMu / 6);
var betaSq = defBeta * defBeta;
var tauSq = defaultDynamicsFactor * defaultDynamicsFactor;
            

function ErrorFunctionCumulativeTo(x) {
    var z = Math.abs(x);

    var t = 2.0 / (2.0 + z);
    var ty = 4 * t - 2;

    var coefficients = [
        -1.3026537197817094, 6.4196979235649026e-1,
        1.9476473204185836e-2, -9.561514786808631e-3, -9.46595344482036e-4,
        3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5,
        -1.624290004647e-6, 1.303655835580e-6, 1.5626441722e-8, -8.5238095915e-8,
        6.529054439e-9, 5.059343495e-9, -9.91364156e-10, -2.27365122e-10,
        9.6467911e-11, 2.394038e-12, -6.886027e-12, 8.94487e-13, 3.13092e-13,
        -1.12708e-13, 3.81e-16, 7.106e-15, -1.523e-15, -9.4e-17, 1.21e-16, -2.8e-17
    ];

    var ncof = coefficients.length;
    var d = 0.0;
    var dd = 0.0;


    for (var j = ncof - 1; j > 0; j--) {
        var tmp = d;
        d = ty * d - dd + coefficients[j];
        dd = tmp;
    }

    var ans = t * Math.exp(-z * z + 0.5 * (coefficients[0] + ty * d) - dd);
    return x >= 0.0 ? ans : (2.0 - ans);
}
function GaussianCumulativeTo(x) {
    var invsqrt2 = -0.707106781186547524400844362104;
    var result = ErrorFunctionCumulativeTo(invsqrt2 * x);
    return 0.5 * result;
}
function GaussAt(x) {
    var standardDeviation = 1.0;
    var mean = 0.0;
    var multiplier = 1.0 / (standardDeviation * Math.sqrt(2 * Math.PI));
    var expPart = Math.exp((-1.0 * Math.pow(x - mean, 2.0)) / (2 * (standardDeviation * standardDeviation)));
    var result = multiplier * expPart;
    return result;
}
function VExceedsMargin(teamDiff, margin, c) {
    var denom = GaussianCumulativeTo(teamDiff / c);
    return GaussAt(teamDiff / c) / denom;
}

function WExceedsMargin(teamDiff, margin, c) {
    var vWin = VExceedsMargin(teamDiff, 0, c)
    return vWin * (vWin + teamDiff / c - margin);
}

function sq(x){return x*x;}

function newTrueSkill(playerSkill, hasWon, scoreDiff, c, winningMean, losingMean) {
    var meanDelta = winningMean - losingMean;
    var v = VExceedsMargin( meanDelta, 0, c);
    var w = WExceedsMargin(meanDelta , 0, c);

    var meanMultiplier = (playerSkill.Sigma * playerSkill.Sigma + tauSq) / c;
    var stdMultiplier = (playerSkill.Sigma * playerSkill.Sigma + tauSq) / (c * c);
    var rankMultiplier = scoreDiff * 0.5; // 1
    var playerMeanDelta = rankMultiplier * meanMultiplier * v;
    var newMean = hasWon ? 
        playerSkill.Mu + playerMeanDelta : 
        playerSkill.Mu - playerMeanDelta;
    
    var newStd = Math.sqrt((playerSkill.Sigma * playerSkill.Sigma + tauSq) * (1 - w * stdMultiplier));
    return { Mu: newMean, Sigma: newStd , Diff: hasWon ? playerMeanDelta : -playerMeanDelta, Rank: Math.max(newMean - 2.3263*newStd,0)};
}
                    
function calcTrueskill(ts1, ts2, ts3, ts4, team1Won, scoreDiff){
    
    var winningMean = team1Won ? (ts1.Mu + ts2.Mu) : (ts3.Mu + ts4.Mu);
    var losingMean = team1Won ? (ts3.Mu + ts4.Mu) : (ts1.Mu + ts2.Mu);
       
   var c = Math.sqrt(ts1.Sigma * ts1.Sigma + ts2.Sigma * ts2.Sigma
        + ts3.Sigma * ts3.Sigma + ts4.Sigma * ts4.Sigma
        + 4 * betaSq);
            
    return [newTrueSkill(ts1, team1Won, scoreDiff, c, winningMean, losingMean),
            newTrueSkill(ts2, team1Won, scoreDiff, c, winningMean, losingMean),
            newTrueSkill(ts3, !team1Won, scoreDiff, c, winningMean, losingMean),
            newTrueSkill(ts4, !team1Won, scoreDiff, c, winningMean, losingMean)];
}
