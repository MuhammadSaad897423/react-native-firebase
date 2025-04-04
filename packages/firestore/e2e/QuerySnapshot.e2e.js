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
const { wipe } = require('./helpers');
const COLLECTION = 'firestore';

describe('firestore.QuerySnapshot', function () {
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

    it('is returned from a collection get()', async function () {
      const snapshot = await firebase.firestore().collection(COLLECTION).get();

      snapshot.constructor.name.should.eql('FirestoreQuerySnapshot');
    });

    it('is returned from a collection onSnapshot()', async function () {
      if (Platform.other) {
        return;
      }
      const callback = sinon.spy();
      firebase.firestore().collection(COLLECTION).onSnapshot(callback);
      await Utils.spyToBeCalledOnceAsync(callback);
      callback.args[0][0].constructor.name.should.eql('FirestoreQuerySnapshot');
    });

    it('returns an array of DocumentSnapshots', async function () {
      const colRef = firebase.firestore().collection(COLLECTION);
      await colRef.add({});
      const snapshot = await colRef.get();
      snapshot.docs.should.be.Array();
      snapshot.docs.length.should.be.aboveOrEqual(1);
      snapshot.docs[0].constructor.name.should.eql('FirestoreDocumentSnapshot');
    });

    it('returns false if not empty', async function () {
      const colRef = firebase.firestore().collection(COLLECTION);
      await colRef.add({});
      const snapshot = await colRef.get();
      snapshot.empty.should.be.Boolean();
      snapshot.empty.should.be.False();
    });

    it('returns true if empty', async function () {
      const colRef = firebase.firestore().collection(`${COLLECTION}/foo/emptycollection`);
      const snapshot = await colRef.get();
      snapshot.empty.should.be.Boolean();
      snapshot.empty.should.be.True();
    });

    it('returns a SnapshotMetadata instance', async function () {
      const colRef = firebase.firestore().collection(COLLECTION);
      const snapshot = await colRef.get();
      snapshot.metadata.constructor.name.should.eql('FirestoreSnapshotMetadata');
    });

    it('returns a Query instance', async function () {
      const colRef = firebase.firestore().collection(COLLECTION);
      const snapshot = await colRef.get();
      snapshot.query.constructor.name.should.eql('FirestoreCollectionReference');
    });

    it('returns size as a number', async function () {
      const colRef = firebase.firestore().collection(COLLECTION);
      const snapshot = await colRef.get();
      snapshot.size.should.be.Number();
    });

    describe('docChanges()', function () {
      it('throws if options is not an object', async function () {
        try {
          const colRef = firebase.firestore().collection(COLLECTION);
          const snapshot = await colRef.limit(1).get();
          snapshot.docChanges(123);
          return Promise.reject(new Error('Did not throw an Error.'));
        } catch (error) {
          error.message.should.containEql("'options' expected an object");
          return Promise.resolve();
        }
      });

      it('throws if options.includeMetadataChanges is not a boolean', async function () {
        try {
          const colRef = firebase.firestore().collection(COLLECTION);
          const snapshot = await colRef.limit(1).get();
          snapshot.docChanges({ includeMetadataChanges: 123 });
          return Promise.reject(new Error('Did not throw an Error.'));
        } catch (error) {
          error.message.should.containEql("'options.includeMetadataChanges' expected a boolean");
          return Promise.resolve();
        }
      });

      it('throws if options.includeMetadataChanges is true, but snapshot does not include those changes', async function () {
        if (Platform.other) {
          return;
        }

        const callback = sinon.spy();
        const colRef = firebase.firestore().collection(COLLECTION);
        const unsub = colRef.onSnapshot(
          {
            includeMetadataChanges: false,
          },
          callback,
        );
        await Utils.spyToBeCalledOnceAsync(callback);
        unsub();
        const snapshot = callback.args[0][0];

        try {
          snapshot.docChanges({ includeMetadataChanges: true });
          return Promise.reject(new Error('Did not throw an Error.'));
        } catch (error) {
          error.message.should.containEql('To include metadata changes with your document changes');
          return Promise.resolve();
        }
      });

      it('returns an array of DocumentChange instances', async function () {
        if (Platform.other) {
          return;
        }
        const colRef = firebase.firestore().collection(COLLECTION);
        await colRef.add({});
        const snapshot = await colRef.limit(1).get();
        const changes = snapshot.docChanges();
        changes.should.be.Array();
        changes.length.should.be.eql(1);
        changes[0].constructor.name.should.eql('FirestoreDocumentChange');
      });

      // FIXME flakey in CI - the changes length comes back unstable
      xit('returns the correct number of document changes if listening to metadata changes', async function () {
        const callback = sinon.spy();
        const colRef = firebase
          .firestore()
          // Firestore caches aggressively, even if you wipe the emulator, local documents are cached
          // between runs, so use random collections to make sure `tests:*:test-reuse` works while iterating
          .collection(`${COLLECTION}/${Utils.randString(12, '#aA')}/metadatachanges-true-true`);
        const unsub = colRef.onSnapshot({ includeMetadataChanges: true }, callback);
        await colRef.add({ foo: 'bar' });
        await Utils.spyToBeCalledTimesAsync(callback, 3);
        unsub();

        const snap1 = callback.args[0][0];
        const snap2 = callback.args[1][0];
        const snap3 = callback.args[2][0];

        snap1.docChanges({ includeMetadataChanges: true }).length.should.be.eql(1);
        snap2.docChanges({ includeMetadataChanges: true }).length.should.be.eql(0);
        snap3.docChanges({ includeMetadataChanges: true }).length.should.be.eql(1);
      });

      // FIXME this flakes on CI, disabling for now
      xit('returns the correct number of document changes if listening to metadata changes, but not including them in docChanges', async function () {
        const callback = sinon.spy();
        const colRef = firebase
          .firestore()
          // Firestore caches aggressively, even if you wipe the emulator, local documents are cached
          // between runs, so use random collections to make sure `tests:*:test-reuse` works while iterating
          .collection(`${COLLECTION}/${Utils.randString(12, '#aA')}/metadatachanges-true-false`);
        const unsub = colRef.onSnapshot({ includeMetadataChanges: true }, callback);
        await Utils.sleep(1000);
        await colRef.add({ foo: 'bar' });
        await Utils.spyToBeCalledTimesAsync(callback, 3, 15000);
        unsub();

        const snap1 = callback.args[0][0];
        const snap2 = callback.args[1][0];
        const snap3 = callback.args[2][0];

        snap1.docChanges({ includeMetadataChanges: false }).length.should.be.eql(1); // FIXME when it flakes, this comes back as 0
        snap2.docChanges({ includeMetadataChanges: false }).length.should.be.eql(0);
        snap3.docChanges({ includeMetadataChanges: false }).length.should.be.eql(0);
      });
    });

    describe('forEach()', function () {
      it('throws if callback is not a function', async function () {
        try {
          const colRef = firebase.firestore().collection(`${COLLECTION}/callbacks/nonfunction`);
          await colRef.add({});
          const snapshot = await colRef.limit(1).get();
          snapshot.forEach(123);
          return Promise.reject(new Error('Did not throw an Error.'));
        } catch (error) {
          error.message.should.containEql("'callback' expected a function");
          return Promise.resolve();
        }
      });

      it('calls back a function', async function () {
        const colRef = firebase.firestore().collection(`${COLLECTION}/callbacks/function`);
        await colRef.add({});
        await colRef.add({});
        const snapshot = await colRef.limit(2).get();
        const callback = sinon.spy();
        snapshot.forEach.should.be.Function();
        snapshot.forEach(callback);
        await Utils.spyToBeCalledTimesAsync(callback, 2, 20000);
        callback.should.be.calledTwice();
        callback.args[0][0].constructor.name.should.eql('FirestoreDocumentSnapshot');
        callback.args[0][1].should.be.Number();
        callback.args[1][0].constructor.name.should.eql('FirestoreDocumentSnapshot');
        callback.args[1][1].should.be.Number();
      });

      it('provides context to the callback', async function () {
        const colRef = firebase.firestore().collection(`${COLLECTION}/callbacks/function-context`);
        await colRef.add({});
        const snapshot = await colRef.limit(1).get();
        const callback = sinon.spy();
        snapshot.forEach.should.be.Function();

        class Foo {}

        snapshot.forEach(callback, Foo);
        await Utils.spyToBeCalledOnceAsync(callback, 20000);
        callback.should.be.calledOnce();
        callback.firstCall.thisValue.should.eql(Foo);
      });
    });

    describe('isEqual()', function () {
      it('throws if other is not a QuerySnapshot', async function () {
        try {
          const qs = await firebase.firestore().collection(COLLECTION).get();
          qs.isEqual(123);
          return Promise.reject(new Error('Did not throw an Error.'));
        } catch (error) {
          error.message.should.containEql("'other' expected a QuerySnapshot instance");
          return Promise.resolve();
        }
      });

      it('returns false if not equal (simple checks)', async function () {
        const colRef = firebase.firestore().collection(COLLECTION);
        // Ensure a doc exists
        await colRef.add({});

        const qs = await colRef.get();

        const querySnap1 = await firebase
          .firestore()
          .collection(`${COLLECTION}/querysnapshot/querySnapshotIsEqual`)
          .get();

        const eq1 = qs.isEqual(querySnap1);

        eq1.should.be.False();
      });

      it('returns false if not equal (expensive checks)', async function () {
        const colRef = firebase
          .firestore()
          .collection(`${COLLECTION}/querysnapshot/querySnapshotIsEqual-False`);
        // Ensure a doc exists
        const docRef = colRef.doc('firstdoc');
        await docRef.set({
          foo: 'bar',
          bar: {
            foo: 1,
          },
        });

        // Grab snapshot
        const qs1 = await colRef.get();

        // Update same collection
        await docRef.update({
          bar: {
            foo: 2,
          },
        });

        const qs2 = await colRef.get();

        const eq1 = qs1.isEqual(qs2);

        eq1.should.be.False();
      });

      it('returns true when equal', async function () {
        const colRef = firebase
          .firestore()
          .collection(`${COLLECTION}/querysnapshot/querySnapshotIsEqual-True`);

        await Promise.all([
          colRef.add({ foo: 'bar' }),
          colRef.add({ foo: 1 }),
          colRef.add({
            foo: {
              foo: 'bar',
            },
          }),
        ]);

        const qs1 = await colRef.get();
        const qs2 = await colRef.get();

        const eq = qs1.isEqual(qs2);

        eq.should.be.True();
      });
    });
  });

  describe('modular', function () {
    it('is returned from a collection get()', async function () {
      const { getFirestore, getDocs, collection } = firestoreModular;

      const snapshot = await getDocs(collection(getFirestore(), COLLECTION));
      snapshot.constructor.name.should.eql('FirestoreQuerySnapshot');
    });

    it('is returned from a collection onSnapshot()', async function () {
      if (Platform.other) {
        return;
      }
      const { getFirestore, collection, onSnapshot } = firestoreModular;
      const callback = sinon.spy();
      onSnapshot(collection(getFirestore(), COLLECTION), callback);
      await Utils.spyToBeCalledOnceAsync(callback);
      callback.args[0][0].constructor.name.should.eql('FirestoreQuerySnapshot');
    });

    it('returns an array of DocumentSnapshots', async function () {
      const { getFirestore, collection, addDoc, getDocs } = firestoreModular;

      const colRef = collection(getFirestore(), COLLECTION);
      await addDoc(colRef, {});
      const snapshot = await getDocs(colRef);
      snapshot.docs.should.be.Array();
      snapshot.docs.length.should.be.aboveOrEqual(1);
      snapshot.docs[0].constructor.name.should.eql('FirestoreDocumentSnapshot');
    });

    it('returns false if not empty', async function () {
      const { getFirestore, collection, addDoc, getDocs } = firestoreModular;
      const colRef = collection(getFirestore(), COLLECTION);
      await addDoc(colRef, {});
      const snapshot = await getDocs(colRef);
      snapshot.empty.should.be.Boolean();
      snapshot.empty.should.be.False();
    });

    it('returns true if empty', async function () {
      const { getFirestore, collection, getDocs } = firestoreModular;
      const colRef = collection(getFirestore(), `${COLLECTION}/foo/emptycollection`);
      const snapshot = await getDocs(colRef);
      snapshot.empty.should.be.Boolean();
      snapshot.empty.should.be.True();
    });

    it('returns a SnapshotMetadata instance', async function () {
      const { getFirestore, collection, getDocs } = firestoreModular;
      const colRef = collection(getFirestore(), COLLECTION);
      const snapshot = await getDocs(colRef);
      snapshot.metadata.constructor.name.should.eql('FirestoreSnapshotMetadata');
    });

    it('returns a Query instance', async function () {
      const { getFirestore, collection, getDocs } = firestoreModular;
      const colRef = collection(getFirestore(), COLLECTION);
      const snapshot = await getDocs(colRef);
      snapshot.query.constructor.name.should.eql('FirestoreCollectionReference');
    });

    it('returns size as a number', async function () {
      const { getFirestore, collection, getDocs } = firestoreModular;
      const colRef = collection(getFirestore(), COLLECTION);
      const snapshot = await getDocs(colRef);
      snapshot.size.should.be.Number();
    });

    describe('docChanges()', function () {
      it('throws if options is not an object', async function () {
        const { getFirestore, collection, getDocs, query, limit } = firestoreModular;
        try {
          const colRef = collection(getFirestore(), COLLECTION);
          const snapshot = await getDocs(query(colRef, limit(1)));
          snapshot.docChanges(123);
          return Promise.reject(new Error('Did not throw an Error.'));
        } catch (error) {
          error.message.should.containEql("'options' expected an object");
          return Promise.resolve();
        }
      });

      it('throws if options.includeMetadataChanges is not a boolean', async function () {
        const { getFirestore, collection, getDocs, query, limit } = firestoreModular;
        try {
          const colRef = collection(getFirestore(), COLLECTION);
          const snapshot = await getDocs(query(colRef, limit(1)));
          snapshot.docChanges({ includeMetadataChanges: 123 });
          return Promise.reject(new Error('Did not throw an Error.'));
        } catch (error) {
          error.message.should.containEql("'options.includeMetadataChanges' expected a boolean");
          return Promise.resolve();
        }
      });

      it('throws if options.includeMetadataChanges is true, but snapshot does not include those changes', async function () {
        if (Platform.other) {
          return;
        }

        const { getFirestore, collection, onSnapshot } = firestoreModular;

        const callback = sinon.spy();
        const colRef = collection(getFirestore(), COLLECTION);
        const unsub = onSnapshot(
          colRef,
          {
            includeMetadataChanges: false,
          },
          callback,
        );
        await Utils.spyToBeCalledOnceAsync(callback);
        unsub();
        const snapshot = callback.args[0][0];

        try {
          snapshot.docChanges({ includeMetadataChanges: true });
          return Promise.reject(new Error('Did not throw an Error.'));
        } catch (error) {
          error.message.should.containEql('To include metadata changes with your document changes');
          return Promise.resolve();
        }
      });

      it('returns an array of DocumentChange instances', async function () {
        if (Platform.other) {
          return;
        }
        const { getFirestore, collection, addDoc, getDocs, query, limit } = firestoreModular;
        const colRef = collection(getFirestore(), COLLECTION);
        await addDoc(colRef, {});
        const snapshot = await getDocs(query(colRef, limit(1)));
        const changes = snapshot.docChanges();
        changes.should.be.Array();
        changes.length.should.be.eql(1);
        changes[0].constructor.name.should.eql('FirestoreDocumentChange');
      });

      // FIXME flakey in CI - the changes length comes back unstable
      xit('returns the correct number of document changes if listening to metadata changes', async function () {
        const { getFirestore, collection, onSnapshot, addDoc } = firestoreModular;
        const callback = sinon.spy();
        const colRef = collection(
          getFirestore(),
          // Firestore caches aggressively, even if you wipe the emulator, local documents are cached
          // between runs, so use random collections to make sure `tests:*:test-reuse` works while iterating
          `${COLLECTION}/${Utils.randString(12, '#aA')}/metadatachanges-true-true`,
        );
        const unsub = onSnapshot(colRef, { includeMetadataChanges: true }, callback);
        await addDoc(colRef, { foo: 'bar' });
        await Utils.spyToBeCalledTimesAsync(callback, 3);
        unsub();

        const snap1 = callback.args[0][0];
        const snap2 = callback.args[1][0];
        const snap3 = callback.args[2][0];

        snap1.docChanges({ includeMetadataChanges: true }).length.should.be.eql(1);
        snap2.docChanges({ includeMetadataChanges: true }).length.should.be.eql(0);
        snap3.docChanges({ includeMetadataChanges: true }).length.should.be.eql(1);
      });

      // FIXME this flakes on CI, disabling for now
      xit('returns the correct number of document changes if listening to metadata changes, but not including them in docChanges', async function () {
        const { getFirestore, collection, onSnapshot, addDoc } = firestoreModular;

        const callback = sinon.spy();
        const colRef = collection(
          getFirestore(),
          // Firestore caches aggressively, even if you wipe the emulator, local documents are cached
          // between runs, so use random collections to make sure `tests:*:test-reuse` works while iterating
          `${COLLECTION}/${Utils.randString(12, '#aA')}/metadatachanges-true-false`,
        );
        const unsub = onSnapshot(colRef, { includeMetadataChanges: true }, callback);
        await Utils.sleep(1000);
        await addDoc(colRef, { foo: 'bar' });
        await Utils.spyToBeCalledTimesAsync(callback, 3, 15000);
        unsub();

        const snap1 = callback.args[0][0];
        const snap2 = callback.args[1][0];
        const snap3 = callback.args[2][0];

        snap1.docChanges({ includeMetadataChanges: false }).length.should.be.eql(1); // FIXME when it flakes, this comes back as 0
        snap2.docChanges({ includeMetadataChanges: false }).length.should.be.eql(0);
        snap3.docChanges({ includeMetadataChanges: false }).length.should.be.eql(0);
      });
    });

    describe('forEach()', function () {
      it('throws if callback is not a function', async function () {
        const { getFirestore, collection, getDocs, query, limit, addDoc } = firestoreModular;

        try {
          const colRef = collection(getFirestore(), `${COLLECTION}/callbacks/nonfunction`);
          await addDoc(colRef, {});
          const snapshot = await getDocs(query(colRef, limit(1)));
          snapshot.forEach(123);
          return Promise.reject(new Error('Did not throw an Error.'));
        } catch (error) {
          error.message.should.containEql("'callback' expected a function");
          return Promise.resolve();
        }
      });

      it('calls back a function', async function () {
        const { getFirestore, collection, addDoc, getDocs, query, limit } = firestoreModular;

        const colRef = collection(getFirestore(), `${COLLECTION}/callbacks/function`);
        await addDoc(colRef, {});
        await addDoc(colRef, {});
        const snapshot = await getDocs(query(colRef, limit(2)));
        const callback = sinon.spy();
        snapshot.forEach.should.be.Function();
        snapshot.forEach(callback);
        await Utils.spyToBeCalledTimesAsync(callback, 2, 20000);
        callback.should.be.calledTwice();
        callback.args[0][0].constructor.name.should.eql('FirestoreDocumentSnapshot');
        callback.args[0][1].should.be.Number();
        callback.args[1][0].constructor.name.should.eql('FirestoreDocumentSnapshot');
        callback.args[1][1].should.be.Number();
      });

      it('provides context to the callback', async function () {
        const { getFirestore, collection, addDoc, getDocs, query, limit } = firestoreModular;

        const colRef = collection(getFirestore(), `${COLLECTION}/callbacks/function-context`);
        await addDoc(colRef, {});
        const snapshot = await getDocs(query(colRef, limit(1)));
        const callback = sinon.spy();
        snapshot.forEach.should.be.Function();

        class Foo {}

        snapshot.forEach(callback, Foo);
        await Utils.spyToBeCalledOnceAsync(callback, 20000);
        callback.should.be.calledOnce();
        callback.firstCall.thisValue.should.eql(Foo);
      });
    });

    describe('isEqual()', function () {
      it('throws if other is not a QuerySnapshot', async function () {
        const { getFirestore, collection, getDocs, snapshotEqual } = firestoreModular;

        try {
          const qs = await getDocs(collection(getFirestore(), COLLECTION));
          snapshotEqual(qs, 123);
          return Promise.reject(new Error('Did not throw an Error.'));
        } catch (error) {
          error.message.should.containEql("'other' expected a QuerySnapshot instance");
          return Promise.resolve();
        }
      });

      it('returns false if not equal (simple checks)', async function () {
        const { getFirestore, collection, addDoc, getDocs, snapshotEqual } = firestoreModular;
        const db = getFirestore();

        const colRef = collection(db, COLLECTION);
        // Ensure a doc exists
        await addDoc(colRef, {});

        const qs = await getDocs(colRef);

        const querySnap1 = await getDocs(
          collection(db, `${COLLECTION}/querysnapshot/querySnapshotIsEqual`),
        );

        const eq1 = snapshotEqual(qs, querySnap1);

        eq1.should.be.False();
      });

      it('returns false if not equal (expensive checks)', async function () {
        const {
          getFirestore,
          collection,
          doc,
          setDoc,
          getDoc,
          getDocs,
          updateDoc,
          query,
          snapshotEqual,
        } = firestoreModular;

        const colRef = collection(
          getFirestore(),
          `${COLLECTION}/querysnapshot/querySnapshotIsEqual-False`,
        );
        // Ensure a doc exists
        const docRef = doc(colRef, 'firstdoc');
        await setDoc(docRef, {
          foo: 'bar',
          bar: {
            foo: 1,
          },
        });

        // Grab snapshot
        const qs1 = await getDoc(colRef);

        // Update same collection
        await updateDoc(docRef, {
          bar: {
            foo: 2,
          },
        });

        const qs2 = await getDocs(query(colRef));

        const eq1 = snapshotEqual(qs1, qs2);

        eq1.should.be.False();
      });

      it('returns true when equal', async function () {
        const { getFirestore, collection, addDoc, getDocs, snapshotEqual } = firestoreModular;

        const colRef = collection(
          getFirestore(),
          `${COLLECTION}/querysnapshot/querySnapshotIsEqual-True`,
        );

        await Promise.all([
          addDoc(colRef, { foo: 'bar' }),
          addDoc(colRef, { foo: 1 }),
          addDoc(colRef, {
            foo: {
              foo: 'bar',
            },
          }),
        ]);

        const qs1 = await getDocs(colRef);
        const qs2 = await getDocs(colRef);

        const eq = snapshotEqual(qs1, qs2);

        eq.should.be.True();
      });
    });
  });
});
