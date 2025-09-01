# Japan Administrative Hierarchy Map

Next.jsで構築された日本の行政区画階層マップアプリケーション。PMTilesベクタータイルとOverpass APIを使用した検索機能を提供します。

## 🚀 機能

- **階層的行政区画表示**: 地方 → 都道府県 → 市区町村 → 詳細の4段階表示
- **汎用検索機能**: レストラン、コンビニ、病院など10カテゴリーの場所検索
- **インタラクティブマップ**: ズーム・クリック操作による階層遷移
- **リアルタイムUI**: 検索結果とマップ情報の同期表示

## 📁 ディレクトリ構成

```
nextjs_app/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # メインページ
│   │   ├── layout.tsx                  # アプリケーションレイアウト
│   │   └── globals.css                 # グローバルスタイル
│   ├── components/
│   │   ├── Map/
│   │   │   └── MapContainer.jsx        # マップコンテナコンポーネント
│   │   ├── Search/
│   │   │   ├── SearchPanel.jsx         # 検索パネルコンポーネント
│   │   │   └── SearchPanel.module.css  # 検索パネルスタイル
│   │   └── UI/
│   │       ├── InfoPanel.jsx           # 情報パネルコンポーネント
│   │       └── InfoPanel.module.css    # 情報パネルスタイル
│   ├── hooks/
│   │   ├── useMap.js                   # マップ管理カスタムフック
│   │   └── useSearch.js                # 検索機能カスタムフック
│   ├── services/
│   │   ├── mapConfig.js                # マップ設定・レイヤー定義
│   │   └── overpassApi.js              # Overpass API通信サービス
│   └── utils/
│       └── mapUtils.js                 # マップユーティリティ関数
├── public/                             # 静的ファイル
├── next.config.ts                      # Next.js設定（プロキシ含む）
├── package.json                        # 依存関係
└── README.md                           # このファイル
```

## 🛠 技術スタック

- **Frontend**: Next.js 15.5, React 18
- **地図ライブラリ**: MapLibre GL JS
- **ベクタータイル**: PMTiles
- **API**: OpenStreetMap Overpass API
- **スタイリング**: CSS Modules
- **TypeScript**: 部分的サポート

## 💻 ローカル開発環境セットアップ

### 前提条件

- Node.js 18.0以上
- npm または yarn

### 1. 依存関係のインストール

```bash
npm install
```

### 2. PMTilesサーバーの起動

別のターミナルでPMTilesファイル用のHTTPサーバーを起動：

```bash
# プロジェクトルートで
cd ../../  # mapnest/mapnest/ ディレクトリに移動
http-server . -p 8080 --cors
```

**重要**: PMTilesファイル（`tiles/japan_all_levels_unified.pmtiles`）が `http://localhost:8080/tiles/` でアクセス可能である必要があります。

### 3. 開発サーバーの起動

```bash
npm run dev
```

### 4. ブラウザでアクセス

[http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認。

## 🌍 本番デプロイ

### Vercel での自動デプロイ

1. **GitHubリポジトリ作成**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Vercel連携**
   - [Vercel](https://vercel.com)にアクセス
   - "New Project" → GitHubリポジトリを選択
   - Root Directory: `nextjs_app` を指定
   - 自動的にビルド・デプロイが実行されます

3. **PMTilesファイルの配置**
   
   **Option A: Vercel Functions API Route**
   ```javascript
   // pages/api/tiles/[...path].js
   export default function handler(req, res) {
     // PMTilesファイルを配信するAPIルート
   }
   ```

   **Option B: 外部CDN**
   ```javascript
   // src/services/mapConfig.js
   PMTILES_URL: 'https://your-cdn.com/tiles/japan_all_levels_unified.pmtiles'
   ```

### 手動デプロイ（任意のプラットフォーム）

1. **ビルド**
   ```bash
   npm run build
   ```

2. **静的ファイル出力**
   ```bash
   npm run start
   ```

3. **Docker使用例**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

## ⚙️ 環境設定

### 環境変数

```bash
# .env.local
NEXT_PUBLIC_PMTILES_URL=http://localhost:8080/tiles/japan_all_levels_unified.pmtiles
NEXT_PUBLIC_OVERPASS_API_URL=https://overpass-api.de/api/interpreter
```

### Next.js設定のカスタマイズ

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/tiles/:path*',
        destination: 'http://localhost:8080/tiles/:path*'
      }
    ];
  }
};
```

## 🔧 開発時のポイント

### 1. デバッグ

```bash
# MapLibre GLのデバッグログを有効化
localStorage.setItem('debug', 'maplibre-gl:*')
```

### 2. PMTilesファイルの確認

```bash
# PMTilesの内容確認
npm install -g @mapbox/pmtiles
pmtiles show tiles/japan_all_levels_unified.pmtiles
```

### 3. 型安全性の向上

```typescript
// 必要に応じてTypeScript型定義を追加
interface SearchResult {
  name: string;
  category: string;
  coordinates: [number, number];
}
```

## 📚 追加リソース

- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js-docs/)
- [PMTiles Specification](https://github.com/protomaps/PMTiles)
- [Overpass API Documentation](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Next.js Documentation](https://nextjs.org/docs)

## 🤝 コントリビューション

1. フォークしてブランチを作成
2. 変更を実装
3. テストを実行: `npm test`
4. プルリクエストを作成

## 📄 ライセンス

MIT License
