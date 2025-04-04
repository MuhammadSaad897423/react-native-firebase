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
const { wipe } = require('../helpers');
const COLLECTION = 'firestore';

describe('firestore().collection().get()', function () {
  before(function () {
    return wipe();
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

    it('throws if get options is not an object', function () {
      try {
        firebase.firestore().collection(COLLECTION).get(123);
        return Promise.reject(new Error('Did not throw an Error.'));
      } catch (error) {
        error.message.should.containEql("'options' must be an object is provided");
        return Promise.resolve();
      }
    });

    it('throws if get options.source is not valid', function () {
      try {
        firebase.firestore().collection(COLLECTION).get({
          source: 'foo',
        });
        return Promise.reject(new Error('Did not throw an Error.'));
      } catch (error) {
        error.message.should.containEql(
          "'options' GetOptions.source must be one of 'default', 'server' or 'cache'",
        );
        return Promise.resolve();
      }
    });

    it('returns a QuerySnapshot', async function () {
      const docRef = firebase.firestore().collection(COLLECTION).doc('nestedcollection');
      const colRef = docRef.collection('get');
      const snapshot = await colRef.get();

      snapshot.constructor.name.should.eql('FirestoreQuerySnapshot');
    });

    it('returns a correct cache setting (true)', async function () {
      if (Platform.other) {
        return;
      }

      const docRef = firebase.firestore().collection(COLLECTION).doc('nestedcollection');
      const colRef = docRef.collection('get');
      const snapshot = await colRef.get({
        source: 'cache',
      });

      snapshot.constructor.name.should.eql('FirestoreQuerySnapshot');
      snapshot.metadata.fromCache.should.be.True();
    });

    it('returns a correct cache setting (false)', async function () {
      const docRef = firebase.firestore().collection(COLLECTION).doc('nestedcollection');
      const colRef = docRef.collection('get');
      await colRef.get(); // Puts it in cache
      const snapshot = await colRef.get({
        source: 'server',
      });

      snapshot.constructor.name.should.eql('FirestoreQuerySnapshot');
      snapshot.metadata.fromCache.should.be.False();
    });
  });

  describe('modular', function () {
    it('returns a QuerySnapshot', async function () {
      const { getFirestore, collection, doc, getDocs } = firestoreModular;

      const docRef = doc(collection(getFirestore(), COLLECTION), 'nestedcollection');
      const colRef = collection(docRef, 'get');
      const snapshot = await getDocs(colRef);

      snapshot.constructor.name.should.eql('FirestoreQuerySnapshot');
    });

    it('returns a correct cache setting (true)', async function () {
      if (Platform.other) {
        return;
      }

      const { getFirestore, collection, doc, getDocsFromCache } = firestoreModular;
      const docRef = doc(collection(getFirestore(), COLLECTION), 'nestedcollection');
      const colRef = collection(docRef, 'get');
      const snapshot = await getDocsFromCache(colRef);

      snapshot.constructor.name.should.eql('FirestoreQuerySnapshot');
      snapshot.metadata.fromCache.should.be.True();
    });

    it('returns a correct cache setting (false)', async function () {
      const { getFirestore, collection, doc, getDocs, getDocsFromServer } = firestoreModular;
      const docRef = doc(collection(getFirestore(), COLLECTION), 'nestedcollection');
      const colRef = collection(docRef, 'get');
      await getDocs(colRef); // Puts it in cache
      const snapshot = await getDocsFromServer(colRef);

      snapshot.constructor.name.should.eql('FirestoreQuerySnapshot');
      snapshot.metadata.fromCache.should.be.False();
    });
  });
});
