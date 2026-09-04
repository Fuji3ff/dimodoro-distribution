# Dimodoro 公開共有ページ運用

このリポジトリは GitHub Pages（`docs/` をソース）で、Routine の公開共有ページとテスト参加案内を公開します。

## 配布方針

- 2026-09-04 に GitHub Releases からのデバッグ APK 直接配布を終了しました。
- 今後のテスト配布は Google Play の内部テストへ一本化します。
- 旧 `v0.1.0` Release は復旧用のドラフトとして保持し、公開しません。
- APK を GitHub Releases や Pages に追加しないでください。

## 内部テストの案内

- 参加 URL は `docs/install/config.json` の `play_opt_in_url` で管理します。
- 参加者は事前に Play Console の内部テスター用メーリングリストへ追加する必要があります。
- 未招待の Google アカウントでは、参加 URL を開いてもインストールできません。

## LINEで送るテンプレ

```text
Dimodoro の内部テストはこちらです。
URL: https://fuji3ff.github.io/dimodoro-distribution/
招待された Google アカウントで開き、テスター参加後に Google Play からインストールしてください。
```

※ GitHub Pages の公開設定やカスタムドメインを変えた場合は URL を差し替えてください。
