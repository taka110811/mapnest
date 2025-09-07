import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log('🗺️ Route optimization API called');
    
    try {
        const body = await request.json();
        const { favorites } = body;
        
        console.log('🔍 Request body:', JSON.stringify(body, null, 2));
        console.log('📍 Favorites count:', favorites?.length || 0);

        if (!favorites || !Array.isArray(favorites)) {
            console.log('❌ Invalid favorites data:', favorites);
            return NextResponse.json(
                { error: 'Invalid favorites data' },
                { status: 400 }
            );
        }

        if (favorites.length < 2) {
            console.log('❌ Not enough favorites:', favorites.length);
            return NextResponse.json(
                { error: 'At least 2 favorites are required for route optimization' },
                { status: 400 }
            );
        }

        console.log(`🗺️ Processing ${favorites.length} favorites for route optimization`);

        // Google Maps API キーを環境変数から取得
        const googleApiKey = process.env.GOOGLE_API_KEY;
        console.log('🔍 Environment check:', {
            hasApiKey: !!googleApiKey,
            nodeEnv: process.env.NODE_ENV,
            apiKeyLength: googleApiKey?.length
        });
        
        if (!googleApiKey) {
            console.error('❌ Google Maps API key not found in environment variables');
            return NextResponse.json(
                { 
                    error: 'Google Maps API key not configured',
                    details: 'GOOGLE_API_KEY environment variable is missing'
                },
                { status: 400 }
            );
        }

        console.log('🗺️ Google Maps API key found, attempting to use API...');
        // Google Maps APIを使った実際のルート最適化
        const optimizationResult = await optimizeFavoritesWithGoogleAPI(favorites, googleApiKey);
        
        return NextResponse.json({
            success: true,
            data: {
                ...optimizationResult,
                summary: [{
                    概要: {
                        訪問地点数: optimizationResult.visitCount,
                        総移動時間: optimizationResult.totalDurationText,
                        総移動距離: optimizationResult.totalDistanceText
                    }
                }],
                googleMapsUrl: optimizationResult.googleMapsUrl
            },
            message: 'Route optimization completed successfully'
        });

    } catch (error: any) {
        console.error('❌ Route optimization error:', error);
        console.error('❌ Error stack:', error.stack);
        
        return NextResponse.json(
            { 
                error: 'Route optimization failed',
                details: error.message || 'Unknown error',
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}


// Google Maps APIを使った実際のルート最適化
async function optimizeFavoritesWithGoogleAPI(favorites: any[], apiKey: string) {
    console.log('🗺️ Google Maps APIを使ってルート最適化を開始');
    
    // 距離行列を計算
    const distanceMatrix = await calculateDistanceMatrix(favorites, apiKey);
    
    // ルートを最適化（Nearest Neighborアルゴリズム）
    const optimization = optimizeRouteWithMatrix(distanceMatrix, favorites);
    
    // ルート詳細を生成
    const routeDetails = generateRouteDetails(optimization.route, favorites, distanceMatrix);
    
    // Google Maps URLを生成
    const googleMapsUrl = generateGoogleMapsUrl(optimization.route, favorites);

    return {
        success: true,
        optimizedRoute: optimization.route.map(i => favorites[i]),
        totalDistance: optimization.totalDistance,
        totalDuration: optimization.totalDuration,
        totalDistanceText: `${(optimization.totalDistance / 1000).toFixed(1)} km`,
        totalDurationText: `${Math.floor(optimization.totalDuration / 60)}分${optimization.totalDuration % 60}秒`,
        routeDetails,
        googleMapsUrl,
        visitCount: favorites.length,
        isMockData: false
    };
}

// 距離行列を計算
async function calculateDistanceMatrix(locations: any[], apiKey: string) {
    console.log('📍 Google Maps Distance Matrix APIで距離を計算中');
    
    const origins = locations.map(formatLocationForAPI);
    const destinations = origins;
    
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    const params = new URLSearchParams({
        origins: origins.join('|'),
        destinations: destinations.join('|'),
        mode: 'driving',
        language: 'ja',
        key: apiKey
    });

    try {
        const response = await fetch(`${url}?${params}`);
        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(`Distance Matrix API error: ${data.status}`);
        }

        return parseDistanceMatrixResponse(data);
    } catch (error) {
        console.error('❌ Distance Matrix API エラー:', error);
        throw new Error('距離計算に失敗しました: ' + (error as Error).message);
    }
}

// 地点データをAPI用にフォーマット
function formatLocationForAPI(location: any): string {
    if (location.coordinates && Array.isArray(location.coordinates)) {
        return `${location.coordinates[1]},${location.coordinates[0]}`;
    } else if (location.address) {
        return location.address;
    } else {
        return location.name;
    }
}

// Distance Matrix APIレスポンスを解析
function parseDistanceMatrixResponse(data: any) {
    const matrix = [];
    
    for (let i = 0; i < data.rows.length; i++) {
        const row = [];
        for (let j = 0; j < data.rows[i].elements.length; j++) {
            const element = data.rows[i].elements[j];
            
            if (element.status === 'OK') {
                row.push({
                    distance: element.distance.value, // メートル
                    duration: element.duration.value, // 秒
                    distanceText: element.distance.text,
                    durationText: element.duration.text
                });
            } else {
                // エラーの場合はデフォルト値
                row.push({
                    distance: i === j ? 0 : 10000,
                    duration: i === j ? 0 : 1800,
                    distanceText: i === j ? '0 km' : '推定 10 km',
                    durationText: i === j ? '0分' : '推定 30分'
                });
            }
        }
        matrix.push(row);
    }

    return matrix;
}

// 巡回セールスマン問題のシンプルな近似解法（Nearest Neighbor）
function optimizeRouteWithMatrix(distanceMatrix: any[], locations: any[]) {
    const n = locations.length;
    
    if (n <= 2) {
        // 2地点以下の場合は順序そのまま
        return {
            route: locations.map((_, index) => index),
            totalDistance: n === 2 ? distanceMatrix[0][1].distance : 0,
            totalDuration: n === 2 ? distanceMatrix[0][1].duration : 0
        };
    }

    // 最初の地点からスタート
    const unvisited = new Set(Array.from({ length: n }, (_, i) => i));
    const route = [0]; // 最初の地点
    unvisited.delete(0);

    let currentLocation = 0;
    let totalDistance = 0;
    let totalDuration = 0;

    // Nearest Neighborアルゴリズム
    while (unvisited.size > 0) {
        let nearestLocation = -1;
        let nearestDistance = Infinity;

        // 最も近い未訪問地点を探す
        for (const location of unvisited) {
            const distance = distanceMatrix[currentLocation][location].distance;
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestLocation = location;
            }
        }

        // 最も近い地点に移動
        route.push(nearestLocation);
        totalDistance += distanceMatrix[currentLocation][nearestLocation].distance;
        totalDuration += distanceMatrix[currentLocation][nearestLocation].duration;
        
        unvisited.delete(nearestLocation);
        currentLocation = nearestLocation;
    }

    // 最初の地点に戻る（周遊ルート）
    totalDistance += distanceMatrix[currentLocation][0].distance;
    totalDuration += distanceMatrix[currentLocation][0].duration;
    route.push(0);

    return {
        route,
        totalDistance,
        totalDuration
    };
}

// ルート詳細情報を生成
function generateRouteDetails(route: number[], locations: any[], distanceMatrix: any[]) {
    const details = [];
    
    for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];
        
        details.push({
            from: locations[from].name,
            to: locations[to].name,
            fromCoords: locations[from].coordinates,
            toCoords: locations[to].coordinates,
            distance: distanceMatrix[from][to].distance,
            duration: distanceMatrix[from][to].duration,
            distanceText: distanceMatrix[from][to].distanceText,
            durationText: distanceMatrix[from][to].durationText
        });
    }
    
    return details;
}

// Google Maps URLを生成
function generateGoogleMapsUrl(route: number[], locations: any[]): string {
    if (route.length < 2) return '';

    const waypoints = [];
    
    // 最初と最後を除く中間地点をwaypointsに追加
    for (let i = 1; i < route.length - 1; i++) {
        const location = locations[route[i]];
        if (location.coordinates) {
            waypoints.push(`${location.coordinates[1]},${location.coordinates[0]}`);
        } else if (location.address) {
            waypoints.push(encodeURIComponent(location.address));
        } else {
            waypoints.push(encodeURIComponent(location.name));
        }
    }

    const origin = locations[route[0]];
    const destination = locations[route[route.length - 1]];
    
    let originParam, destinationParam;
    
    if (origin.coordinates) {
        originParam = `${origin.coordinates[1]},${origin.coordinates[0]}`;
    } else if (origin.address) {
        originParam = encodeURIComponent(origin.address);
    } else {
        originParam = encodeURIComponent(origin.name);
    }

    if (destination.coordinates) {
        destinationParam = `${destination.coordinates[1]},${destination.coordinates[0]}`;
    } else if (destination.address) {
        destinationParam = encodeURIComponent(destination.address);
    } else {
        destinationParam = encodeURIComponent(destination.name);
    }

    let url = `https://www.google.com/maps/dir/${originParam}`;
    
    if (waypoints.length > 0) {
        url += `/${waypoints.join('/')}`;
    }
    
    url += `/${destinationParam}`;

    return url;
}