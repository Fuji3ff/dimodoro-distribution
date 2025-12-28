# Dimodoro 配布ページ運用

このリポジトリは GitHub Pages（docs/ をソース）で配布ページを公開します。
APK 本体は GitHub Releases にのみ置き、リポジトリへコミットしません。

## 新APKの更新手順
1. GitHub Releases で新しい Release を作成する
2. asset 名は必ず `dimodoro-latest.apk` で添付する（latest/download を固定するため）
3. 期限を更新する場合は `docs/install/config.json` の `expires_at` を更新する
4. Play ストア導線を出す場合は `play_opt_in_url` / `play_listing_url` を設定する

## 設定ファイル
- `docs/install/config.json` を編集すると配布ページに反映されます
- `expires_at` を過ぎると警告が表示されますが、APK のダウンロードは継続できます

## LINEで送るテンプレ（URLはページ1本）
```
Dimodoro テスト版のインストールはこちらです。
URL: https://fuji3ff.github.io/dimodoro-distribution/
APKを押す → ダウンロード → インストール
ブロックされたらこの提供元を許可をON（通話で案内します）
```

※ GitHub Pages の公開設定やカスタムドメインを変えた場合は URL を差し替えてください。
