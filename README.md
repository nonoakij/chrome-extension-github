# chrome-extension-github

Chrome extension to save List of merge commits to Clipboard when creating a PR in Github.

## HOW TO USE [EN]

1. clone this project.
2. access chrome://extensions/
3. Turn on developer mode.
4. Click on Load Unpacked
5. Add cloned project

## 使い方 [JP]

1. このプロジェクトをクローンする
2. chrome://extensions/ にアクセスする
3. デベロッパーモードをオンにする
4. パッケージ化されてない拡張機能を読み込む
5. クローンしたこのプロジェクトを追加する

## 未確認レビューモード

PR の `/pull/番号/changes` ページで、歯車メニューを開き、「Compact line height」の下の「未確認レビューモード」を押すと有効になります。

- 一番上の未 Viewed ファイルまでスクロールし、Viewed ボタンにフォーカスします。
- Space または Enter、クリックで Viewed を付けると、次の未確認ファイルへ移動します。
- ↑ / ↓ で Viewed 済みも含めた前後のファイルの Viewed ボタンへ移動します。先頭・末尾では止まります。
- Shift + ↑ / ↓ で前後の未確認ファイルの Viewed ボタンへ移動します。
- 末尾のファイルに Viewed を付けた場合、前方に未確認ファイルが残っていればそこへ戻ります。
- Esc またはモードボタンで終了します。別のページへ移動した場合も終了します。
- コメント入力中やダイアログ内では、↑ / ↓ キーの通常の操作を維持します。

対象は現在表示されている差分ファイルです。ファイルの絞り込みや遅延読み込みにより未表示のファイルは、表示されてから対象になります。

ソースを変更した場合は `pnpm build` を実行してから `chrome://extensions/` で拡張機能を更新し、GitHub のページを再読み込みしてください。
