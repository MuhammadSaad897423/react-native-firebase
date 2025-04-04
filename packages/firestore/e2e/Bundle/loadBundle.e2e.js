/*
 * Copyright (c) 2016-present Invertase Limited & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
const { wipe, getBundle, BUNDLE_COLLECTION } = require('../helpers');

describe('firestore().loadBundle()', function () {
  // Not supported on web.
  if (Platform.other) {
    return;
  }

  before(async function () {
    return await wipe();
  });

  describe('v8 compatibility', function () {
    beforeEach(async function beforeEachTest() {
      // @ts-ignore
      globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
    });

    afterEach(async function afterEachTest() {
      // @ts-ignore
      globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = false;
    });

    it('loads the bundle contents', async function () {
      const bundle = getBundle();
      const progress = await firebase.firestore().loadBundle(bundle);
      const query = firebase.firestore().collection(BUNDLE_COLLECTION);
      const snapshot = await query.get({ source: 'cache' });

      progress.taskState.should.eql('Success');
      progress.documentsLoaded.should.eql(6);
      snapshot.size.should.eql(6);
    });

    it('throws if invalid bundle', async function () {
      try {
        await firebase.firestore().loadBundle('not-a-bundle');
        return Promise.reject(new Error('Did not throw an Error.'));
      } catch (_) {
        /*
         * Due to inconsistent error throws between Android and iOS Firebase SDK,
         * it is not able to test a specific error message.
         * Android SDK throws 'invalid-arguments', while iOS SDK throws 'unknown'
         */
        return Promise.resolve();
      }
    });
  });

  describe('modular', function () {
    it('loads the bundle contents', async function () {
      const { getFirestore, loadBundle, collection, getDocsFromCache } = firestoreModular;
      const db = getFirestore();

      const bundle = getBundle();
      const progress = await loadBundle(db, bundle);
      const query = collection(db, BUNDLE_COLLECTION);
      const snapshot = await getDocsFromCache(query);

      progress.taskState.should.eql('Success');
      progress.documentsLoaded.should.eql(6);
      snapshot.size.should.eql(6);
    });

    it('throws if invalid bundle', async function () {
      const { getFirestore, loadBundle } = firestoreModular;

      try {
        await loadBundle(getFirestore(), 'not-a-bundle');
        return Promise.reject(new Error('Did not throw an Error.'));
      } catch (_) {
        /*
         * Due to inconsistent error throws between Android and iOS Firebase SDK,
         * it is not able to test a specific error message.
         * Android SDK throws 'invalid-arguments', while iOS SDK throws 'unknown'
         */
        return Promise.resolve();
      }
    });
  });
});
